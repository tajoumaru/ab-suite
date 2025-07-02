import { GM_xmlhttpRequest } from "$";
import type { RequestOptions, SeadexEntry, SeadexResponse, TorrentInfo } from "@/types";

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
  private async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", timeout = 10000, headers = {} } = options;

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: url.toString(),
        timeout,
        headers,
        ontimeout: () => reject(new ApiError(`Request timed out after ${timeout}ms`)),
        onerror: (_) => reject(new ApiError("Network request failed", 0)),
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

  async fetchSeadex(torrentIds: TorrentInfo[]): Promise<Record<string, SeadexEntry>> {
    if (torrentIds.length === 0) return {};

    const baseURL = new URL("https://releases.moe/api/collections/entries/records");
    const query = torrentIds.map(({ torrentId }) => `trs.url?~'%torrentid=${torrentId}%'`).join("||");

    baseURL.searchParams.set("filter", `(trs.tracker?='AB' && (${query}))`);
    baseURL.searchParams.set("expand", "trs");
    baseURL.searchParams.set("fields", "*,expand.trs.url,expand.trs.isBest");
    baseURL.searchParams.set("skipTotal", "true");

    try {
      const response = await this.request<SeadexResponse>(baseURL.toString());

      const linkMap: Record<string, SeadexEntry> = {};
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
      console.error("AB Suite (SeaDex): Failed to fetch data", error);
      throw error;
    }
  }

  // Batch processing for large torrent lists
  async fetchSeadexBatched(torrentIds: TorrentInfo[], batchSize = 100): Promise<Record<string, SeadexEntry>> {
    const results: Record<string, SeadexEntry> = {};

    for (let i = 0; i < torrentIds.length; i += batchSize) {
      const batch = torrentIds.slice(i, i + batchSize);
      try {
        const batchResults = await this.fetchSeadex(batch);
        Object.assign(results, batchResults);
      } catch (error) {
        console.error(`AB Suite: Failed to fetch batch ${i}-${i + batchSize}`, error);
        // Continue with other batches even if one fails
      }
    }

    return results;
  }
}
export const apiService = new ApiService();
