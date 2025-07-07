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

      log(`AB Suite: Rate limit exceeded for ${apiKey}: ${count}/${check.limit} per ${check.name}`);
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
  log(`AB Suite: Recorded request for ${apiKey}. Total recent requests: ${entry.timestamps.length}`);
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
  log(`AB Suite: Cleared rate limit data for ${apiKey}`);
}

/**
 * Clear all rate limit data
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  log("AB Suite: Cleared all rate limit data");
}

/**
 * Rate-limited version of setTimeout that respects API limits
 */
export async function rateLimitedDelay(apiKey: string, config?: RateLimitConfig): Promise<void> {
  const check = checkRateLimit(apiKey, config);
  if (!check.allowed && check.retryAfter) {
    log(`AB Suite: Rate limited, waiting ${check.retryAfter} seconds for ${apiKey}`);
    await new Promise((resolve) => setTimeout(resolve, check.retryAfter * 1000));
  }
}
