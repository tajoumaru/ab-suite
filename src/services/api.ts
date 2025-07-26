import { apiRequest } from "@/lib/api";
import type { SeaDexEntry, SeaDexResponse, TorrentInfo } from "@/lib/types";
import { err } from "@/lib/utils/logging";

interface AutocompleteResult {
  id: string;
  name: string;
  year: string;
  type: string;
}

interface AutocompleteResponse {
  results?: AutocompleteResult[];
}

class ApiService {
  private requestCache = new Map<string, Promise<unknown>>();

  private async request<T>(
    url: string,
    options: { method?: "GET" | "POST" | "HEAD"; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const cacheKey = `${url}${JSON.stringify(options)}`;

    // Check if we have a pending request for this exact URL+options combination
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey) as Promise<T>;
    }

    // Create new request promise using centralized apiRequest
    const requestPromise = apiRequest<T>({
      method: options.method || "GET",
      url: url.toString(),
      headers: options.headers,
      responseType: "json",
    });

    // Store the promise in cache
    this.requestCache.set(cacheKey, requestPromise);

    // Clean up cache entry when request completes (success or failure)
    requestPromise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return requestPromise;
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
