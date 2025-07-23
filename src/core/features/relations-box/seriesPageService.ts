import { apiRequest } from "@/lib/api";
import { getCachedValue, setCachedValue } from "@/lib/utils/cache";

export interface SeriesEntry {
  year: number;
  url: string;
  type: string;
  title?: string;
}

const SERIES_CACHE_TTL = 3600000; // 1 hour

// Helper function to parse series entries from a document
function parseSeriesEntries(doc: Document, baseUrl: string): SeriesEntry[] {
  const h3Elements = doc.querySelectorAll("#anime_table h3, #printed_media_table h3");
  const entries: SeriesEntry[] = [];

  h3Elements.forEach((h3) => {
    const text = h3.textContent || "";

    // Extract year from the format "2025 - "
    const yearMatch = text.match(/^(\d{4})\s*-/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

    // Find the torrent link (has title="View Torrent")
    const torrentLink = h3.querySelector('a[title="View Torrent"]');
    if (!torrentLink) return;

    // Extract type from the torrent link text
    const type = torrentLink.textContent?.trim() || "";

    // Get the URL from the torrent link
    const href = torrentLink.getAttribute("href");
    if (!href) return;

    // Convert relative URL to absolute
    const url = new URL(href, baseUrl).href;

    // Extract title from series link if it exists
    const seriesLink = h3.querySelector('a[href*="/series.php"]');
    const title = seriesLink?.textContent?.trim();

    entries.push({
      year,
      url,
      type,
      title,
    });
  });

  return entries;
}

// Helper function to fetch and parse a single series page
function fetchSingleSeriesPage(seriesUrl: string): Promise<{ entries: SeriesEntry[]; parentUrl?: string }> {
  return apiRequest<string>({
    method: "GET",
    url: seriesUrl,
    responseType: "text",
  })
    .then((responseText) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseText, "text/html");

        // Check if this is a sub-series page by looking for #content h2 a
        const parentLink = doc.querySelector("#content h2 a");
        const parentHref = parentLink?.getAttribute("href");
        const parentUrl = parentHref ? new URL(parentHref, seriesUrl).href : undefined;

        // Parse entries from this page
        const entries = parseSeriesEntries(doc, seriesUrl);

        return { entries, parentUrl };
      } catch (error) {
        throw new Error(`Failed to parse series page: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    })
    .catch(() => {
      throw new Error("Failed to fetch series page");
    });
}

export async function fetchSeriesPageData(seriesUrl: string): Promise<SeriesEntry[]> {
  const cacheKey = `series-page-${seriesUrl}`;

  // Check cache first
  const cached = await getCachedValue<SeriesEntry[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Fetch the initial series page
    const { entries: initialEntries, parentUrl } = await fetchSingleSeriesPage(seriesUrl);

    let finalEntries = initialEntries;

    // If there's a parent series URL, fetch that too and combine the results
    if (parentUrl && parentUrl !== seriesUrl) {
      const { entries: parentEntries } = await fetchSingleSeriesPage(parentUrl);
      // Combine entries, removing duplicates by URL
      const allEntries = [...initialEntries, ...parentEntries];
      const uniqueEntries = allEntries.filter(
        (entry, index, self) => index === self.findIndex((e) => e.url === entry.url),
      );
      finalEntries = uniqueEntries;
    }

    // Cache the results
    setCachedValue(cacheKey, finalEntries, { ttl: SERIES_CACHE_TTL });

    return finalEntries;
  } catch (error) {
    throw new Error(`Failed to fetch series page data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
