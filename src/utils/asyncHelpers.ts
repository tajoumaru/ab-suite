/**
 * Async utilities for common patterns in AB Suite
 */

/**
 * Utility for creating retry functionality with exponential backoff
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Executes an async function with retry logic and exponential backoff
 */
export async function withRetry<T>(asyncFunction: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: Error = new Error("All retries failed");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await asyncFunction();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt or if shouldRetry returns false
      if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * backoffMultiplier ** (attempt - 1), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Utility for debouncing async functions to prevent excessive API calls
 */
export function debounceAsync<T extends readonly unknown[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  delay: number,
): (...args: T) => Promise<R> {
  let timeoutId: number | undefined;
  let pendingPromise: { resolve: (value: R) => void; reject: (error: unknown) => void } | null = null;

  return (...args: T): Promise<R> => {
    return new Promise<R>((resolve, reject) => {
      // Clear existing timeout
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Reject the previous pending promise if it exists
      if (pendingPromise) {
        pendingPromise.reject(new Error("Debounced"));
      }

      // Store the new promise resolvers
      pendingPromise = { resolve, reject };

      // Set new timeout
      timeoutId = window.setTimeout(async () => {
        try {
          const result = await asyncFunction(...args);
          if (pendingPromise) {
            pendingPromise.resolve(result);
            pendingPromise = null;
          }
        } catch (error) {
          if (pendingPromise) {
            pendingPromise.reject(error);
            pendingPromise = null;
          }
        }
      }, delay);
    });
  };
}

/**
 * Utility for throttling async functions to limit execution frequency
 */
export function throttleAsync<T extends readonly unknown[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  interval: number,
): (...args: T) => Promise<R> {
  let lastExecution = 0;
  let pendingExecution: Promise<R> | null = null;

  return async (...args: T): Promise<R> => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecution;

    if (timeSinceLastExecution >= interval) {
      lastExecution = now;
      return asyncFunction(...args);
    }

    // If there's already a pending execution, return it
    if (pendingExecution) {
      return pendingExecution;
    }

    // Schedule the next execution
    const timeToWait = interval - timeSinceLastExecution;
    pendingExecution = new Promise<R>((resolve, reject) => {
      setTimeout(async () => {
        try {
          lastExecution = Date.now();
          const result = await asyncFunction(...args);
          pendingExecution = null;
          resolve(result);
        } catch (error) {
          pendingExecution = null;
          reject(error);
        }
      }, timeToWait);
    });

    return pendingExecution;
  };
}

/**
 * Utility for handling common async error patterns with standardized error messages
 */
export class AsyncError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "AsyncError";
  }

  static fromNetworkError(error: Error): AsyncError {
    return new AsyncError(
      "Network request failed. Please check your connection and try again.",
      "NETWORK_ERROR",
      error,
    );
  }

  static fromTimeoutError(error: Error): AsyncError {
    return new AsyncError("Request timed out. Please try again.", "TIMEOUT_ERROR", error);
  }

  static fromParsingError(error: Error): AsyncError {
    return new AsyncError("Failed to process server response. Please try again.", "PARSING_ERROR", error);
  }

  static fromUnknownError(error: unknown): AsyncError {
    const message = error instanceof Error ? error.message : String(error);
    return new AsyncError(
      `An unexpected error occurred: ${message}`,
      "UNKNOWN_ERROR",
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Wraps an async function with standardized error handling
 */
export function withErrorHandling<T extends readonly unknown[], R>(
  asyncFunction: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      // Handle specific error types
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw AsyncError.fromNetworkError(error);
      }

      if (error instanceof Error && error.name === "TimeoutError") {
        throw AsyncError.fromTimeoutError(error);
      }

      if (error instanceof SyntaxError) {
        throw AsyncError.fromParsingError(error);
      }

      // Re-throw AsyncError instances as-is
      if (error instanceof AsyncError) {
        throw error;
      }

      // Handle unknown errors
      throw AsyncError.fromUnknownError(error);
    }
  };
}

/**
 * Utility for combining multiple async operations with different strategies
 */
export interface CombineOptions {
  /** Strategy for combining results */
  strategy?: "all" | "allSettled" | "race" | "any";
  /** Timeout in milliseconds for the entire operation */
  timeout?: number;
}

/**
 * Combines multiple async operations with configurable strategies
 */
export async function combineAsync<T extends readonly Promise<unknown>[]>(
  promises: T,
  options: CombineOptions = {},
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const { strategy = "all", timeout } = options;

  let combinedPromise: Promise<unknown>;

  switch (strategy) {
    case "all":
      combinedPromise = Promise.all(promises);
      break;
    case "allSettled":
      combinedPromise = Promise.allSettled(promises);
      break;
    case "race":
      combinedPromise = Promise.race(promises);
      break;
    case "any":
      combinedPromise = Promise.any(promises);
      break;
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }

  if (timeout) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Operation timed out")), timeout);
    });

    combinedPromise = Promise.race([combinedPromise, timeoutPromise]);
  }

  return combinedPromise as Promise<{ [K in keyof T]: Awaited<T[K]> }>;
}

/**
 * Utility for creating cached async functions with TTL support
 */
export interface CacheOptions {
  /** Cache key function */
  keyFn?: (...args: readonly unknown[]) => string;
  /** Time to live in milliseconds */
  ttl?: number;
  /** Maximum cache size */
  maxSize?: number;
}

/**
 * Creates a cached version of an async function
 */
export function withCache<T extends readonly unknown[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: CacheOptions = {},
): (...args: T) => Promise<R> {
  const { keyFn = (...args) => JSON.stringify(args), ttl = 300000, maxSize = 100 } = options;

  const cache = new Map<string, { value: R; timestamp: number }>();

  return async (...args: T): Promise<R> => {
    const key = keyFn(...args);
    const now = Date.now();

    // Check cache
    const cached = cache.get(key);
    if (cached && now - cached.timestamp < ttl) {
      return cached.value;
    }

    // Execute function
    const result = await asyncFunction(...args);

    // Store in cache
    cache.set(key, { value: result, timestamp: now });

    // Cleanup old entries if cache is too large
    if (cache.size > maxSize) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 20% of entries
      const toRemove = Math.floor(maxSize * 0.2);
      for (let i = 0; i < toRemove; i++) {
        cache.delete(entries[i][0]);
      }
    }

    return result;
  };
}
