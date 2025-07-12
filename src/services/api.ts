import type { RequestOptions, SeaDexEntry, SeaDexResponse, TorrentInfo } from "@/types";
import { err } from "@/utils/logging";

interface AutocompleteResult {
  id: string;
  name: string;
  year: string;
  type: string;
}

interface AutocompleteResponse {
  results?: AutocompleteResult[];
}

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiService {
  private requestCache = new Map<string, Promise<unknown>>();

  private async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const cacheKey = `${url}${JSON.stringify(options)}`;

    // Check if we have a pending request for this exact URL+options combination
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey) as Promise<T>;
    }

    // Create new request promise
    const requestPromise = this.makeRequest<T>(url, options);

    // Store the promise in cache
    this.requestCache.set(cacheKey, requestPromise);

    // Clean up cache entry when request completes (success or failure)
    requestPromise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return requestPromise;
  }

  private async makeRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", timeout = 10000, headers = {} } = options;

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: method as "GET" | "POST" | "HEAD" | undefined,
        url: url.toString(),
        headers,
        timeout,
        ontimeout: () => reject(new ApiError(`Request timed out after ${timeout}ms`)),
        onerror: () => reject(new ApiError("Network request failed", 0)),
        onload: (response) => {
          if (response.status >= 400) {
            reject(new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status));
            return;
          }

          try {
            const data = JSON.parse(response.responseText);
            resolve(data);
          } catch (_) {
            reject(new ApiError("Failed to parse JSON response"));
          }
        },
      });
    });
  }

  /**
   * Clear the request cache manually if needed
   * Useful for testing or forcing fresh requests
   */
  clearRequestCache(): void {
    this.requestCache.clear();
  }

  /**
   * Get current cache size for debugging
   */
  getCacheSize(): number {
    return this.requestCache.size;
  }

  async autocompleteSearch(query: string, type: "anime" | "music"): Promise<AutocompleteResult[]> {
    if (!query.trim()) return [];

    try {
      const timestamp = Date.now();
      const response = await this.request<AutocompleteResponse>(
        `/xhr/ac/search/${type}?q=${encodeURIComponent(query)}&cache=${timestamp}`,
      );

      return response.results || [];
    } catch (error) {
      err("Autocomplete API error:", error);
      throw error;
    }
  }

  async fetchSeaDex(torrentIds: TorrentInfo[]): Promise<Record<string, SeaDexEntry>> {
    if (torrentIds.length === 0) return {};

    const baseURL = new URL("https://releases.moe/api/collections/entries/records");
    const query = torrentIds.map(({ torrentId }) => `trs.url?~'%torrentid=${torrentId}%'`).join("||");

    baseURL.searchParams.set("filter", `(trs.tracker?='AB' && (${query}))`);
    baseURL.searchParams.set("expand", "trs");
    baseURL.searchParams.set("fields", "*,expand.trs.url,expand.trs.isBest");
    baseURL.searchParams.set("skipTotal", "true");

    try {
      const response = await this.request<SeaDexResponse>(baseURL.toString());

      const linkMap: Record<string, SeaDexEntry> = {};
      const torrentIdRegex = /&torrentid=(\d+)/i;

      for (const { alID, notes, comparison, expand } of response.items) {
        for (const { url, isBest } of expand.trs) {
          const torrentId = url.match(torrentIdRegex)?.[1];
          if (torrentId) {
            linkMap[torrentId] = {
              alID,
              notes,
              isBest,
              comparison: comparison.split(",").filter(Boolean),
            };
          }
        }
      }

      return linkMap;
    } catch (error) {
      err("AB Suite (SeaDex): Failed to fetch data", error);
      throw error;
    }
  }
}
export const apiService = new ApiService();
