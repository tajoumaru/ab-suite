import { log } from "@/utils/logging";
import { checkRateLimit, type RateLimitConfig, recordRequest } from "@/utils/rateLimit";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** Time to live in milliseconds. Default: 24 hours */
  ttl?: number;
  /** Whether to cache failed responses. Default: true */
  cacheFailures?: boolean;
  /** TTL for failed responses in milliseconds. Default: 1 hour */
  failureTtl?: number;
  /** API key for rate limiting. Required for rate-limited calls */
  apiKey?: string;
  /** Custom rate limit configuration for this API */
  rateLimits?: RateLimitConfig;
}

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_FAILURE_TTL = 60 * 60 * 1000; // 1 hour

const CACHE_KEY_PREFIX = "ab-suite-cache-";

/**
 * Get a cached value if it exists and hasn't expired
 */
export async function getCachedValue<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = CACHE_KEY_PREFIX + key;
    const cached = GM_getValue(cacheKey, null) as string | null;

    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    if (now > entry.expiresAt) {
      // Expired, remove from cache
      GM_deleteValue(cacheKey);
      log(`AB Suite: Cache expired for key: ${key}`);
      return null;
    }

    log(`AB Suite: Cache hit for key: ${key}`);
    return entry.data;
  } catch (error) {
    log("AB Suite: Cache get error", error);
    return null;
  }
}

/**
 * Set a value in the cache with expiration
 */
export async function setCachedValue<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
  try {
    const { ttl = DEFAULT_TTL } = options;
    const cacheKey = CACHE_KEY_PREFIX + key;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    GM_setValue(cacheKey, JSON.stringify(entry));
    log(`AB Suite: Cached data for key: ${key} (TTL: ${ttl}ms)`);
  } catch (error) {
    log("AB Suite: Cache set error", error);
  }
}

/**
 * Cache a failed response with shorter TTL
 */
export async function setCachedFailure(key: string, error: unknown, options: CacheOptions = {}): Promise<void> {
  if (options.cacheFailures === false) {
    return;
  }

  const { failureTtl = DEFAULT_FAILURE_TTL } = options;
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  await setCachedValue(
    key,
    { error: true, message: errorMessage },
    {
      ttl: failureTtl,
    },
  );
}

/**
 * Check if a cached entry represents a failure
 */
export function isCachedFailure(data: unknown): boolean {
  return data !== null && typeof data === "object" && "error" in data && (data as { error: unknown }).error === true;
}

/**
 * Clear all cache entries (for debugging/maintenance)
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = GM_listValues();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

    for (const key of cacheKeys) {
      GM_deleteValue(key);
    }

    log(`AB Suite: Cleared ${cacheKeys.length} cache entries`);
  } catch (error) {
    log("AB Suite: Cache clear error", error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { totalEntries: number; totalSize: number } {
  try {
    const keys = GM_listValues();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

    let totalSize = 0;
    for (const key of cacheKeys) {
      const value = GM_getValue(key, "");
      totalSize += typeof value === "string" ? value.length : JSON.stringify(value).length;
    }

    return {
      totalEntries: cacheKeys.length,
      totalSize,
    };
  } catch (error) {
    log("AB Suite: Cache stats error", error);
    return { totalEntries: 0, totalSize: 0 };
  }
}

/**
 * Wrapper for API calls with automatic caching and rate limiting
 */
export async function cachedApiCall<T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T | null> {
  // Check cache first - cached responses don't count against rate limits
  const cached = await getCachedValue<T>(cacheKey);
  if (cached !== null) {
    if (isCachedFailure(cached)) {
      log(`AB Suite: Returning cached failure for: ${cacheKey}`);
      return null;
    }
    log(`AB Suite: Cache hit for: ${cacheKey}`);
    return cached;
  }

  // Check rate limits before making API call (only if apiKey is provided)
  if (options.apiKey) {
    const rateLimitCheck = checkRateLimit(options.apiKey, options.rateLimits);
    if (!rateLimitCheck.allowed) {
      log(`AB Suite: Rate limit exceeded for ${options.apiKey}: ${rateLimitCheck.reason}`);

      // Cache the rate limit failure temporarily to avoid repeated checks
      await setCachedFailure(cacheKey, new Error(`Rate limited: ${rateLimitCheck.reason}`), {
        ...options,
        failureTtl: (rateLimitCheck.retryAfter || 60) * 1000, // Use retryAfter or default to 1 minute
      });

      return null;
    }
  }

  // Make API call
  try {
    log(`AB Suite: Making API call for: ${cacheKey}`);
    const result = await apiCall();

    // Record the request for rate limiting (only if apiKey is provided and request succeeded)
    if (options.apiKey && result !== null) {
      recordRequest(options.apiKey);
    }

    if (result !== null) {
      await setCachedValue(cacheKey, result, options);
    }

    return result;
  } catch (error) {
    log(`AB Suite: API call failed for: ${cacheKey}`, error);

    // Still record the request for rate limiting even if it failed
    if (options.apiKey) {
      recordRequest(options.apiKey);
    }

    await setCachedFailure(cacheKey, error, options);
    return null;
  }
}
