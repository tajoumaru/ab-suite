import { useEffect, useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { cachedApiCall } from "@/utils/cache";
import { PRINTED_MEDIA_TYPES } from "@/utils/format-mapping";
import { err, log } from "@/utils/logging";

type StringNull = string | null;
type NumberNull = number | null;
type TraktType = "movies" | "shows" | null;

export interface AnimeApiResponse {
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

interface SimklSearchResponse {
  type: string;
  title: string;
  year: number;
  ids: {
    simkl: number;
    slug: string;
  };
}

interface SimklDetailResponse {
  title: string;
  year: number;
  ids: {
    simkl: number;
    slug: string;
    anidb?: string;
    mal?: string;
    imdb?: string;
    tmdb?: string;
    anilist?: string;
    kitsu?: string;
    [key: string]: string | number | undefined;
  };
}

interface KitsuApiResponse {
  data: {
    id: string;
    attributes: {
      averageRating?: string;
      ratingFrequencies?: {
        [key: string]: string;
      };
    };
  };
}

export interface MediaInfo {
  seriesTitle: string;
  mediaType: string;
  searchTitle: string;
  searchMediaType: "anime" | "manga";
  malId: string | null;
  apiData: AnimeApiResponse | null;
  kitsuRating: number | null;
  kitsuVotes: number | null;
  siteRating: number | null;
  siteVotes: number | null;
  externalLinks: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * Fetch Kitsu data and calculate average rating from rating frequencies
 */
async function fetchKitsuData(kitsuId: string): Promise<{ rating: number | null; votes: number | null }> {
  const cacheKey = `kitsu-rating-${kitsuId}`;

  const kitsuData = await cachedApiCall(
    cacheKey,
    () =>
      new Promise<KitsuApiResponse | null>((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: `https://kitsu.app/api/edge/anime/${kitsuId}`,
          onload: (response) => {
            if (response.status === 200) {
              try {
                const data = JSON.parse(response.responseText);
                resolve(data);
              } catch (error) {
                log("Failed to parse Kitsu response", error);
                resolve(null);
              }
            } else {
              log("Kitsu API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch Kitsu data");
            resolve(null);
          },
        });
      }),
    {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "kitsu",
    },
  );

  if (!kitsuData?.data?.attributes) {
    return { rating: null, votes: null };
  }

  const attributes = kitsuData.data.attributes;
  let rating: number | null = null;
  let votes: number | null = null;

  // If averageRating is available, use it directly
  if (attributes.averageRating) {
    rating = parseFloat(attributes.averageRating);
    rating = Number.isNaN(rating) ? null : rating;
  }

  // Calculate from rating frequencies if available
  if (attributes.ratingFrequencies) {
    const frequencies = attributes.ratingFrequencies;
    let totalWeightedScore = 0;
    let totalRatings = 0;

    // Kitsu uses ratings from 2-20 (even numbers only)
    for (let score = 2; score <= 20; score += 2) {
      const frequency = parseInt(frequencies[score.toString()] || "0", 10);
      if (frequency > 0) {
        totalWeightedScore += score * frequency;
        totalRatings += frequency;
      }
    }

    if (totalRatings > 0) {
      // If we didn't get averageRating directly, calculate it
      if (rating === null) {
        const averageOn20Scale = totalWeightedScore / totalRatings;
        rating = (averageOn20Scale / 20) * 100;
      }
      votes = totalRatings;
    }
  }

  return { rating, votes };
}

/**
 * Fetch additional anime IDs from SIMKL API
 */
async function fetchSimklData(
  malId: string,
  clientId: string,
  existingSimklId?: number,
): Promise<SimklDetailResponse | null> {
  let simklId: number;

  if (existingSimklId) {
    // Use the existing SIMKL ID, skip search
    simklId = existingSimklId;
    log(`Using existing SIMKL ID: ${simklId}`);
  } else {
    // First, search for the anime by MAL ID
    const searchCacheKey = `simkl-search-mal-${malId}`;
    const searchResults = await cachedApiCall(
      searchCacheKey,
      () =>
        new Promise<SimklSearchResponse[]>((resolve) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.simkl.com/search/id?mal=${malId}&client_id=${clientId}`,
            onload: (response) => {
              if (response.status === 200) {
                try {
                  const data = JSON.parse(response.responseText);
                  resolve(Array.isArray(data) ? data : []);
                } catch (error) {
                  log("Failed to parse SIMKL search response", error);
                  resolve([]);
                }
              } else {
                log("SIMKL search API returned status", response.status);
                resolve([]);
              }
            },
            onerror: () => {
              log("Failed to fetch SIMKL search data");
              resolve([]);
            },
          });
        }),
      {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - IDs rarely change
        failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
        apiKey: "simkl",
      },
    );

    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    // Get the first result's SIMKL ID
    simklId = searchResults[0].ids.simkl;
  }

  // Fetch detailed information with all IDs
  const detailCacheKey = `simkl-detail-${simklId}`;
  const detailData = await cachedApiCall(
    detailCacheKey,
    () =>
      new Promise<SimklDetailResponse | null>((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: `https://api.simkl.com/anime/${simklId}?extended=full&client_id=${clientId}`,
          onload: (response) => {
            if (response.status === 200) {
              try {
                const data = JSON.parse(response.responseText);
                resolve(data);
              } catch (error) {
                log("Failed to parse SIMKL detail response", error);
                resolve(null);
              }
            } else {
              log("SIMKL detail API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch SIMKL detail data");
            resolve(null);
          },
        });
      }),
    {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - IDs rarely change
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "simkl",
    },
  );

  return detailData;
}

/**
 * Merge SIMKL IDs with existing anime API data
 */
function mergeSimklData(apiData: AnimeApiResponse, simklData: SimklDetailResponse): AnimeApiResponse {
  return {
    ...apiData,
    // Only update fields that are null/missing in the original data
    imdb: apiData.imdb || (simklData.ids.imdb ? simklData.ids.imdb : null),
    themoviedb: apiData.themoviedb || (simklData.ids.tmdb ? parseInt(simklData.ids.tmdb, 10) : null),
    anidb: apiData.anidb || (simklData.ids.anidb ? parseInt(simklData.ids.anidb, 10) : null),
    anilist: apiData.anilist || (simklData.ids.anilist ? parseInt(simklData.ids.anilist, 10) : null),
    kitsu: apiData.kitsu || (simklData.ids.kitsu ? parseInt(simklData.ids.kitsu, 10) : null),
    // Add SIMKL ID itself
    simkl: simklData.ids.simkl,
  };
}

/**
 * Custom hook to extract media information from the torrent group page.
 * This replaces the imperative data extraction from ExternalLinks component.
 */
export function useMediaInfo(): MediaInfo | null {
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const { simklClientId } = useSettingsStore();

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
            const cacheKey = `anime-api-mal-${malId}`;
            apiData = await cachedApiCall(
              cacheKey,
              () =>
                new Promise<AnimeApiResponse | null>((resolve) => {
                  GM_xmlhttpRequest({
                    method: "GET",
                    url: `https://anime-api-tajoumarus-projects.vercel.app/mal/${malId}`,
                    onload: (response) => {
                      if (response.status === 200) {
                        try {
                          const data = JSON.parse(response.responseText);
                          resolve(data);
                        } catch (parseError) {
                          err("Failed to parse anime API response", parseError);
                          resolve(null);
                        }
                      } else {
                        err("Anime API returned status", response.status);
                        resolve(null);
                      }
                    },
                    onerror: () => {
                      err("Failed to fetch anime API data");
                      resolve(null);
                    },
                  });
                }),
              {
                ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - anime IDs rarely change
                failureTtl: 60 * 60 * 1000, // 1 hour for failures
                apiKey: "anime-api",
              },
            );
          } catch (error) {
            err("Failed to fetch anime API data", error);
          }
        }

        log("Fetched API Data", apiData);

        // Fetch additional IDs from SIMKL if client ID is provided and MAL ID exists
        if (simklClientId && malId && apiData) {
          try {
            const existingSimklId = apiData.simkl ? apiData.simkl : undefined;
            const simklData = await fetchSimklData(malId, simklClientId, existingSimklId);
            if (simklData) {
              // Merge SIMKL IDs with existing apiData
              apiData = mergeSimklData(apiData, simklData);
              log("Merged SIMKL data", apiData);
            }
          } catch (error) {
            log("Failed to fetch SIMKL data", error);
          }
        }

        // Fetch Kitsu rating if Kitsu ID is available
        let kitsuRating: number | null = null;
        let kitsuVotes: number | null = null;
        if (apiData?.kitsu) {
          try {
            const kitsuData = await fetchKitsuData(apiData.kitsu.toString());
            kitsuRating = kitsuData.rating;
            kitsuVotes = kitsuData.votes;
            log("Fetched Kitsu rating", kitsuRating);
          } catch (error) {
            log("Failed to fetch Kitsu rating", error);
          }
        }

        // Extract site's own rating from the page
        let siteRating: number | null = null;
        let siteVotes: number | null = null;
        try {
          const ratingStatsElement = document.querySelector("#rating_stats");
          if (ratingStatsElement) {
            const avgRatingElement = ratingStatsElement.querySelector("#avg_rating");
            const numRatingElement = ratingStatsElement.querySelector("#num_rating");

            if (avgRatingElement && numRatingElement) {
              const avgRatingText = avgRatingElement.textContent?.trim();
              const numRatingText = numRatingElement.textContent?.trim();

              if (avgRatingText && numRatingText) {
                siteRating = parseFloat(avgRatingText);
                siteVotes = parseInt(numRatingText, 10);

                // Validate the extracted values
                if (Number.isNaN(siteRating) || Number.isNaN(siteVotes)) {
                  siteRating = null;
                  siteVotes = null;
                }
              }
            }
          }
        } catch (error) {
          log("Failed to extract site rating", error);
        }

        // Create external links
        const externalLinks: Array<{ name: string; url: string }> = [];

        if (apiData?.anilist) {
          // Use actual AniList ID from API
          externalLinks.push({
            name: "AniList",
            url: `https://anilist.co/anime/${apiData.anilist}`,
          });
        }

        if (apiData?.kitsu) {
          // Add Kitsu link
          externalLinks.push({
            name: "Kitsu",
            url: `https://kitsu.app/anime/${apiData.kitsu}`,
          });
        }

        if (apiData?.imdb) {
          // Add IMDB link
          externalLinks.push({
            name: "IMDB",
            url: `https://www.imdb.com/title/${apiData.imdb}`,
          });
        }

        if (apiData?.themoviedb) {
          // Add TMDB link - use tv for anime, movie for everything else
          const tmdbMediaType = searchMediaType === "anime" ? "tv" : "movie";
          externalLinks.push({
            name: "TMDB",
            url: `https://www.themoviedb.org/${tmdbMediaType}/${apiData.themoviedb}`,
          });
        }

        return {
          seriesTitle,
          mediaType,
          searchTitle,
          searchMediaType,
          malId,
          apiData,
          kitsuRating,
          kitsuVotes,
          siteRating,
          siteVotes,
          externalLinks,
        };
      } catch (error) {
        err("Failed to extract media info", error);
        return null;
      }
    };

    extractMediaInfo().then(setMediaInfo);
  }, [simklClientId]);

  return mediaInfo;
}
