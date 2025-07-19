import { log } from "@/utils/logging";

export interface RateLimitConfig {
  /** Requests per second */
  perSecond: number;
  /** Requests per minute */
  perMinute: number;
  /** Requests per hour */
  perHour: number;
  /** Requests per day */
  perDay: number;
}

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  perSecond: 3,
  perMinute: 15,
  perHour: 250,
  perDay: 1000,
};

// Rate limit storage - keyed by API identifier
const rateLimitStore = new Map<string, RateLimitEntry>();

// Time windows in milliseconds
const TIME_WINDOWS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const;

/**
 * Clean up old timestamps that are outside any relevant time window
 */
function cleanupTimestamps(entry: RateLimitEntry, now: number): void {
  // Only keep timestamps from the last day (longest time window)
  const cutoff = now - TIME_WINDOWS.day;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
  entry.lastCleanup = now;
}

/**
 * Count requests within a specific time window
 */
function countRequestsInWindow(timestamps: number[], windowMs: number, now: number): number {
  const cutoff = now - windowMs;
  return timestamps.filter((ts) => ts > cutoff).length;
}

/**
 * Check if a request would exceed any rate limits
 */
export function checkRateLimit(
  apiKey: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): {
  allowed: boolean;
  reason?: string;
  retryAfter: number;
} {
  const now = Date.now();

  // Get or create rate limit entry for this API
  let entry = rateLimitStore.get(apiKey);
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now };
    rateLimitStore.set(apiKey, entry);
  }

  // Clean up old timestamps periodically (every 5 minutes)
  if (now - entry.lastCleanup > 5 * 60 * 1000) {
    cleanupTimestamps(entry, now);
  }

  // Check each rate limit
  const checks = [
    {
      window: TIME_WINDOWS.second,
      limit: config.perSecond,
      name: "second",
    },
    {
      window: TIME_WINDOWS.minute,
      limit: config.perMinute,
      name: "minute",
    },
    {
      window: TIME_WINDOWS.hour,
      limit: config.perHour,
      name: "hour",
    },
    {
      window: TIME_WINDOWS.day,
      limit: config.perDay,
      name: "day",
    },
  ];

  for (const check of checks) {
    const count = countRequestsInWindow(entry.timestamps, check.window, now);
    if (count >= check.limit) {
      // Calculate when the oldest request in this window will expire
      const cutoff = now - check.window;
      const oldestInWindow = entry.timestamps.find((ts) => ts > cutoff);
      const retryAfter = oldestInWindow ? oldestInWindow + check.window - now : check.window;

      log(`Rate limit exceeded for ${apiKey}: ${count}/${check.limit} per ${check.name}`);
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${count}/${check.limit} requests per ${check.name}`,
        retryAfter: Math.ceil(retryAfter / 1000), // Convert to seconds
      };
    }
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Record a successful request (should only be called for actual API calls, not cache hits)
 */
export function recordRequest(apiKey: string): void {
  const now = Date.now();

  let entry = rateLimitStore.get(apiKey);
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now };
    rateLimitStore.set(apiKey, entry);
  }

  entry.timestamps.push(now);
  log(`Recorded request for ${apiKey}. Total recent requests: ${entry.timestamps.length}`);
}

/**
 * Get rate limit statistics for an API
 */
export function getRateLimitStats(
  apiKey: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): {
  perSecond: { current: number; limit: number };
  perMinute: { current: number; limit: number };
  perHour: { current: number; limit: number };
  perDay: { current: number; limit: number };
} {
  const now = Date.now();
  const entry = rateLimitStore.get(apiKey);

  if (!entry) {
    return {
      perSecond: { current: 0, limit: config.perSecond },
      perMinute: { current: 0, limit: config.perMinute },
      perHour: { current: 0, limit: config.perHour },
      perDay: { current: 0, limit: config.perDay },
    };
  }

  return {
    perSecond: {
      current: countRequestsInWindow(entry.timestamps, TIME_WINDOWS.second, now),
      limit: config.perSecond,
    },
    perMinute: {
      current: countRequestsInWindow(entry.timestamps, TIME_WINDOWS.minute, now),
      limit: config.perMinute,
    },
    perHour: {
      current: countRequestsInWindow(entry.timestamps, TIME_WINDOWS.hour, now),
      limit: config.perHour,
    },
    perDay: {
      current: countRequestsInWindow(entry.timestamps, TIME_WINDOWS.day, now),
      limit: config.perDay,
    },
  };
}

/**
 * Clear rate limit data for an API (useful for testing/debugging)
 */
export function clearRateLimit(apiKey: string): void {
  rateLimitStore.delete(apiKey);
  log(`Cleared rate limit data for ${apiKey}`);
}

/**
 * Clear all rate limit data
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  log("Cleared all rate limit data");
}

/**
 * Rate-limited version of setTimeout that respects API limits
 */
export async function rateLimitedDelay(apiKey: string, config?: RateLimitConfig): Promise<void> {
  const check = checkRateLimit(apiKey, config);
  if (!check.allowed && check.retryAfter) {
    log(`Rate limited, waiting ${check.retryAfter} seconds for ${apiKey}`);
    await new Promise((resolve) => setTimeout(resolve, check.retryAfter * 1000));
  }
}

// Request queue for managing concurrent requests with rate limiting
interface QueuedRequest {
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  retryCount: number;
  maxRetries: number;
}

const requestQueues = new Map<string, QueuedRequest[]>();
const activeRequests = new Map<string, number>();

/**
 * Execute a function with automatic rate limiting and retry logic
 */
export async function executeWithRateLimit<T>(
  apiKey: string,
  requestFn: () => Promise<T>,
  options: {
    config?: RateLimitConfig;
    maxRetries?: number;
    exponentialBackoff?: boolean;
  } = {},
): Promise<T> {
  const { config = DEFAULT_RATE_LIMITS, maxRetries = 3, exponentialBackoff = true } = options;

  return new Promise<T>((resolve, reject) => {
    const queuedRequest: QueuedRequest = {
      execute: requestFn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
      retryCount: 0,
      maxRetries,
    };

    // Add to queue
    if (!requestQueues.has(apiKey)) {
      requestQueues.set(apiKey, []);
    }
    const queue = requestQueues.get(apiKey);
    if (queue) {
      queue.push(queuedRequest);
    }

    // Process queue
    processQueue(apiKey, config, exponentialBackoff);
  });
}

/**
 * Process the request queue for an API with rate limiting
 */
async function processQueue(apiKey: string, config: RateLimitConfig, exponentialBackoff: boolean): Promise<void> {
  const queue = requestQueues.get(apiKey);
  const activeCount = activeRequests.get(apiKey) || 0;

  if (!queue || queue.length === 0 || activeCount >= config.perSecond) {
    return;
  }

  const request = queue.shift();
  if (!request) return;

  // Check rate limit
  const rateLimitCheck = checkRateLimit(apiKey, config);
  if (!rateLimitCheck.allowed) {
    // Put request back at front of queue
    queue.unshift(request);

    // Wait and try again
    const delay = exponentialBackoff
      ? Math.min(rateLimitCheck.retryAfter * 1000 * 2 ** request.retryCount, 60000)
      : rateLimitCheck.retryAfter * 1000;

    setTimeout(() => processQueue(apiKey, config, exponentialBackoff), delay);
    return;
  }

  // Track active request
  activeRequests.set(apiKey, activeCount + 1);

  try {
    const result = await request.execute();
    recordRequest(apiKey);
    request.resolve(result);
  } catch (error) {
    if (request.retryCount < request.maxRetries) {
      request.retryCount++;
      log(`Request failed, retrying (${request.retryCount}/${request.maxRetries}) for ${apiKey}:`, error);

      // Add back to queue for retry
      queue.unshift(request);

      // Wait before retry with exponential backoff
      const delay = exponentialBackoff ? Math.min(1000 * 2 ** request.retryCount, 30000) : 1000;

      setTimeout(() => processQueue(apiKey, config, exponentialBackoff), delay);
    } else {
      log(`Request failed after ${request.maxRetries} retries for ${apiKey}:`, error);
      request.reject(error);
    }
  } finally {
    // Decrease active count
    const newActiveCount = Math.max(0, (activeRequests.get(apiKey) || 1) - 1);
    activeRequests.set(apiKey, newActiveCount);

    // Process next request after a small delay to respect rate limits
    setTimeout(() => processQueue(apiKey, config, exponentialBackoff), 100);
  }
}
