import { getCachedValue, setCachedValue } from "@/lib/utils/cache";

export interface RequestOptions {
  method?: "GET" | "POST" | "HEAD";
  url: string;
  headers?: Record<string, string>;
  data?: unknown;
  responseType?: "json" | "text";
  cache?: {
    key: string;
    ttl: number; // Time to live in milliseconds
  };
}

// This becomes the single point of contact for all external requests.
export async function apiRequest<T>(options: RequestOptions): Promise<T> {
  // Check cache first if caching is requested
  if (options.cache) {
    const cached = await getCachedValue<T>(options.cache.key);
    if (cached !== null) {
      return cached;
    }
  }

  const result = await new Promise<T>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: options.method || "GET",
      url: options.url,
      headers: options.headers,
      data: options.data ? JSON.stringify(options.data) : undefined,
      responseType: options.responseType as "json" | undefined,
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          let responseData: T;
          if (options.responseType === "text") {
            responseData = response.responseText as T;
          } else {
            responseData = response.response as T;
          }
          resolve(responseData);
        } else {
          reject(new Error(`Request failed with status ${response.status}`));
        }
      },
      onerror: () => reject(new Error("Request failed")),
    });
  });

  // Cache the result if caching is requested
  if (options.cache) {
    await setCachedValue(options.cache.key, result, { ttl: options.cache.ttl });
  }

  return result;
}
