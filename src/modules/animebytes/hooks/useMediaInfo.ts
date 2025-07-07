import { useEffect, useState } from "preact/hooks";
import { PRINTED_MEDIA_TYPES } from "@/utils/format-mapping";
import { log } from "@/utils/logging";

type StringNull = string | null;
type NumberNull = number | null;
type TraktType = "movies" | "shows" | null;

interface AnimeApiResponse {
  title: string;
  anidb: NumberNull;
  anilist: NumberNull;
  animenewsnetwork: NumberNull;
  animeplanet: StringNull;
  anisearch: NumberNull;
  annict: NumberNull;
  imdb: StringNull;
  kaize: StringNull;
  kaize_id: NumberNull;
  kitsu: NumberNull;
  livechart: NumberNull;
  myanimelist: NumberNull;
  nautiljon: StringNull;
  nautiljon_id: NumberNull;
  notify: StringNull;
  otakotaku: NumberNull;
  simkl: NumberNull;
  shikimori: NumberNull;
  shoboi: NumberNull;
  silveryasha: NumberNull;
  themoviedb: NumberNull;
  trakt: NumberNull;
  trakt_type: TraktType;
  trakt_season: NumberNull;
}

export interface MediaInfo {
  seriesTitle: string;
  mediaType: string;
  searchTitle: string;
  searchMediaType: "anime" | "manga";
  malId: string | null;
  apiData: AnimeApiResponse | null;
  externalLinks: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * Custom hook to extract media information from the torrent group page.
 * This replaces the imperative data extraction from ExternalLinks component.
 */
export function useMediaInfo(): MediaInfo | null {
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);

  useEffect(() => {
    // Only run on torrent pages
    if (!window.location.pathname.includes("/torrents.php")) {
      return;
    }

    const extractMediaInfo = async (): Promise<MediaInfo | null> => {
      try {
        let seriesTitle: string;
        let mediaType: string;
        const isEditPage = window.location.href.includes("action=editgroup");

        if (isEditPage) {
          const h2Links = document.querySelectorAll("h2 a");
          if (h2Links.length < 2) return null;

          seriesTitle = h2Links[0]?.textContent?.trim() || "";
          mediaType = h2Links[1]?.textContent?.trim() || "";
        } else {
          const h2Element = document.querySelector("h2");
          if (!h2Element) return null;

          const html = h2Element.innerHTML;
          const match = html.match(/>(.*?)<\/a> - (.*?) \[\d{4}\]/);
          if (!match) return null;

          seriesTitle = match[1];
          mediaType = match[2];
        }

        if (!seriesTitle || !mediaType) return null;

        // Get romaji title if available
        let searchTitle = seriesTitle;
        const mangaStats = document.getElementsByClassName("stats nobullet")[0];
        if (mangaStats) {
          const romajiMatch = mangaStats.innerHTML.match(/Romaji Title:<\/strong> <br>(.*?)<\/li>/);
          if (romajiMatch) {
            searchTitle = romajiMatch[1];
          }
        }

        // Handle URL encoding
        searchTitle = searchTitle.replace(/&amp;/g, "%26");

        // Determine search media type
        const searchMediaType = PRINTED_MEDIA_TYPES.includes(mediaType) ? "manga" : "anime";

        // Find MAL ID from the page
        const findMalId = (): string | null => {
          const contentLinks = document.querySelectorAll("#content h3 a");
          for (const link of contentLinks) {
            const linkElement = link as HTMLAnchorElement;
            const text = linkElement.textContent?.trim();
            const href = linkElement.href;

            if (text === "MAL" || href.includes("myanimelist")) {
              // Extract MAL ID from href
              const malMatch = href.match(/\/anime\/(\d+)/);
              if (malMatch) {
                return malMatch[1];
              }
            }
          }
          return null;
        };

        const malId = findMalId();
        let apiData: AnimeApiResponse | null = null;

        // Fetch data from API if MAL ID is found
        if (malId) {
          try {
            apiData = await new Promise<AnimeApiResponse | null>((resolve) => {
              GM_xmlhttpRequest({
                method: "GET",
                url: `https://anime-api-tajoumarus-projects.vercel.app/mal/${malId}`,
                onload: (response) => {
                  if (response.status === 200) {
                    try {
                      const data = JSON.parse(response.responseText);
                      resolve(data);
                    } catch (parseError) {
                      console.error("AB Suite: Failed to parse anime API response", parseError);
                      resolve(null);
                    }
                  } else {
                    console.error("AB Suite: Anime API returned status", response.status);
                    resolve(null);
                  }
                },
                onerror: () => {
                  console.error("AB Suite: Failed to fetch anime API data");
                  resolve(null);
                },
              });
            });
          } catch (error) {
            console.error("AB Suite: Failed to fetch anime API data", error);
          }
        }

        log("AB Suite: Fetched API Data", apiData);

        // Create external links
        const externalLinks: Array<{ name: string; url: string }> = [];

        if (apiData?.anilist) {
          // Use actual AniList ID from API
          externalLinks.push({
            name: "AniList",
            url: `https://anilist.co/anime/${apiData.anilist}`,
          });
        }

        return {
          seriesTitle,
          mediaType,
          searchTitle,
          searchMediaType,
          malId,
          apiData,
          externalLinks,
        };
      } catch (error) {
        console.error("AB Suite: Failed to extract media info", error);
        return null;
      }
    };

    extractMediaInfo().then(setMediaInfo);
  }, []);

  return mediaInfo;
}
