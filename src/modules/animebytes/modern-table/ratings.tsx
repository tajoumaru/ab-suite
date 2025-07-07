import { useEffect, useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { cachedApiCall } from "@/utils/cache";
import { log } from "@/utils/logging";
import type { AnimeApiResponse, MediaInfo } from "../hooks/useMediaInfo";

// API Response Interfaces
interface JikanAnimeResponse {
  data: {
    score: number | null;
    scored_by: number | null;
    rank: number | null;
    url: string;
  };
}

interface AnidbAnimeResponse {
  rating: number | null;
  votes: number | null;
}

interface AnilistAnimeResponse {
  data: {
    Media: {
      id: number;
      averageScore: number | null;
      popularity: number | null;
    };
  };
}

interface KitsuAnimeResponse {
  data: {
    attributes: {
      averageRating: string | null;
      ratingFrequencies: { [key: string]: string } | null;
    };
  };
}

interface TmdbResponse {
  vote_average: number;
  vote_count: number;
  id: number;
  external_ids?: {
    imdb_id: string;
  };
}

interface ImdbJsonLd {
  url: string;
  aggregateRating: {
    ratingValue: number;
    ratingCount: number;
  };
}

// Rating Data Interface
interface PlatformRating {
  platform: string;
  score: number | null;
  maxScore: number;
  votes: number | null;
  rank?: number | null;
  detailsUrl?: string;
  loading: boolean;
  error: boolean;
}

interface RatingsProps {
  apiData: AnimeApiResponse;
  mediaInfo?: MediaInfo;
}

const PLATFORM_ICONS = {
  MyAnimeList: "https://mei.kuudere.pw/6oHQTbmDfrs.png",
  AniDB: "https://mei.kuudere.pw/iiD0CGjgEl7.png",
  AniList: "https://mei.kuudere.pw/h7552tISkKb.png",
  Kitsu: "https://mei.kuudere.pw/fjJ7w593D8o.png",
  TMDb: "https://mei.kuudere.pw/Cg5yNKBvz3E.png",
  IMDb: "https://mei.kuudere.pw/gtY9cKsJV77.png",
};

export function Ratings({ apiData, mediaInfo }: RatingsProps) {
  const settings = useSettingsStore();
  const [ratings, setRatings] = useState<PlatformRating[]>([
    {
      platform: "AniList",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "MyAnimeList",
      score: null,
      maxScore: 10,
      votes: null,
      rank: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "IMDb",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "Kitsu",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "TMDb",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "AniDB",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
  ]);

  // Fetch MyAnimeList data via Jikan API
  const fetchMyAnimeListData = async (malId: number) => {
    const cacheKey = `jikan-anime-${malId}`;
    return cachedApiCall(
      cacheKey,
      () =>
        new Promise<JikanAnimeResponse | null>((resolve) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.jikan.moe/v4/anime/${malId}`,
            onload: (response) => {
              if (response.status === 200) {
                try {
                  const data = JSON.parse(response.responseText);
                  resolve(data);
                } catch (error) {
                  log("AB Suite: Failed to parse Jikan API response", error);
                  resolve(null);
                }
              } else {
                log("AB Suite: Jikan API returned status", response.status);
                resolve(null);
              }
            },
            onerror: () => {
              log("AB Suite: Failed to fetch Jikan API data");
              resolve(null);
            },
          });
        }),
      {
        ttl: 24 * 60 * 60 * 1000, // 24 hours - ratings change infrequently
        failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
        apiKey: "jikan",
      },
    );
  };

  // Fetch AniDB data
  const fetchAnidbData = async (anidbId: number) => {
    const cacheKey = `anidb-anime-${anidbId}`;
    return cachedApiCall(
      cacheKey,
      () =>
        new Promise<AnidbAnimeResponse | null>((resolve) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: `http://api.anidb.net:9001/httpapi?client=absuite&clientver=1&protover=1&request=anime&aid=${anidbId}`,
            onload: (response) => {
              if (response.status === 200) {
                try {
                  const parser = new DOMParser();
                  const xmlDoc = parser.parseFromString(response.responseText, "text/xml");
                  const ratingElement = xmlDoc.querySelector("ratings > permanent");

                  if (ratingElement) {
                    const rating = parseFloat(ratingElement.textContent || "0");
                    const votes = parseInt(ratingElement.getAttribute("count") || "0", 10);
                    resolve({ rating: rating || null, votes: votes || null });
                  } else {
                    resolve({ rating: null, votes: null });
                  }
                } catch (error) {
                  log("AB Suite: Failed to parse AniDB API response", error);
                  resolve(null);
                }
              } else {
                log("AB Suite: AniDB API returned status", response.status);
                resolve(null);
              }
            },
            onerror: () => {
              log("AB Suite: Failed to fetch AniDB API data");
              resolve(null);
            },
          });
        }),
      {
        ttl: 24 * 60 * 60 * 1000, // 24 hours - ratings change infrequently
        failureTtl: 6 * 60 * 60 * 1000, // 6 hours for failures (AniDB can be flaky)
        apiKey: "anidb",
      },
    );
  };

  // Fetch AniList data via GraphQL
  const fetchAnilistData = async (anilistId: number) => {
    const cacheKey = `anilist-anime-${anilistId}`;

    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          averageScore
          popularity
        }
      }
    `;

    const variables = { id: anilistId };

    return cachedApiCall(
      cacheKey,
      () =>
        new Promise<AnilistAnimeResponse | null>((resolve) => {
          GM_xmlhttpRequest({
            method: "POST",
            url: "https://graphql.anilist.co",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            data: JSON.stringify({ query, variables }),
            onload: (response) => {
              if (response.status === 200) {
                try {
                  const data = JSON.parse(response.responseText);
                  resolve(data);
                } catch (error) {
                  log("AB Suite: Failed to parse AniList API response", error);
                  resolve(null);
                }
              } else {
                log("AB Suite: AniList API returned status", response.status);
                resolve(null);
              }
            },
            onerror: () => {
              log("AB Suite: Failed to fetch AniList API data");
              resolve(null);
            },
          });
        }),
      {
        ttl: 12 * 60 * 60 * 1000, // 12 hours - AniList updates more frequently
        failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
        apiKey: "anilist",
      },
    );
  };

  // Fetch Kitsu data
  const fetchKitsuData = async (kitsuId: number) => {
    const cacheKey = `kitsu-anime-${kitsuId}`;
    return cachedApiCall(
      cacheKey,
      () =>
        new Promise<KitsuAnimeResponse | null>((resolve) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: `https://kitsu.app/api/edge/anime/${kitsuId}`,
            headers: {
              Accept: "application/vnd.api+json",
            },
            onload: (response) => {
              if (response.status === 200) {
                try {
                  const data = JSON.parse(response.responseText);
                  resolve(data);
                } catch (error) {
                  log("AB Suite: Failed to parse Kitsu API response", error);
                  resolve(null);
                }
              } else {
                log("AB Suite: Kitsu API returned status", response.status);
                resolve(null);
              }
            },
            onerror: () => {
              log("AB Suite: Failed to fetch Kitsu API data");
              resolve(null);
            },
          });
        }),
      {
        ttl: 24 * 60 * 60 * 1000, // 24 hours - ratings change infrequently
        failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
        apiKey: "kitsu",
      },
    );
  };

  // Fetch TMDB data
  const fetchTmdbData = async (tmdbId: number, mediaType: "movie" | "tv") => {
    if (!settings.tmdbApiToken) {
      log("AB Suite: TMDB API token not configured");
      return null;
    }

    const cacheKey = `tmdb-${mediaType}-${tmdbId}`;
    return cachedApiCall(
      cacheKey,
      () =>
        new Promise<TmdbResponse | null>((resolve) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.themoviedb.org/3/${mediaType}/${tmdbId}`,
            headers: {
              Authorization: `Bearer ${settings.tmdbApiToken}`,
              Accept: "application/json",
            },
            onload: (response) => {
              if (response.status === 200) {
                try {
                  const data = JSON.parse(response.responseText);
                  resolve(data);
                } catch (error) {
                  log("AB Suite: Failed to parse TMDB API response", error);
                  resolve(null);
                }
              } else {
                log("AB Suite: TMDB API returned status", response.status);
                resolve(null);
              }
            },
            onerror: () => {
              log("AB Suite: Failed to fetch TMDB API data");
              resolve(null);
            },
          });
        }),
      {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
        apiKey: "tmdb",
      },
    );
  };

  // Fetch IMDb data by scraping
  const fetchImdbData = async (imdbId: string) => {
    const cacheKey = `imdb-scrape-${imdbId}`;
    return cachedApiCall(
      cacheKey,
      () =>
        new Promise<ImdbJsonLd | null>((resolve) => {
          const url = `https://www.imdb.com/title/${imdbId}/`;
          GM_xmlhttpRequest({
            method: "GET",
            url,
            onload: (response) => {
              if (response.status === 200) {
                try {
                  // Extract only the JSON-LD script to avoid loading external resources
                  const jsonLdMatch = response.responseText.match(
                    /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s,
                  );
                  if (!jsonLdMatch) {
                    log("AB Suite: IMDb JSON-LD script not found");
                    resolve(null);
                    return;
                  }

                  const jsonData = JSON.parse(jsonLdMatch[1]);

                  if (!jsonData.aggregateRating || !jsonData.url) {
                    log("AB Suite: Invalid IMDb JSON-LD data", jsonData);
                    resolve(null);
                    return;
                  }

                  resolve(jsonData);
                } catch (error) {
                  log("AB Suite: Failed to parse IMDb page", error);
                  resolve(null);
                }
              } else {
                log("AB Suite: IMDb returned status", response.status);
                resolve(null);
              }
            },
            onerror: () => {
              log("AB Suite: Failed to fetch IMDb data");
              resolve(null);
            },
          });
        }),
      {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - ratings change slowly
        failureTtl: 6 * 60 * 60 * 1000, // 6 hours for failures
        apiKey: "imdb",
      },
    );
  };

  // Update a specific platform's rating
  const updatePlatformRating = (platformIndex: number, updates: Partial<PlatformRating>) => {
    setRatings((prev) => prev.map((rating, index) => (index === platformIndex ? { ...rating, ...updates } : rating)));
  };

  // Fetch all ratings
  useEffect(() => {
    const fetchAllRatings = async () => {
      // AniList
      if (apiData.anilist) {
        updatePlatformRating(0, { loading: true });
        const anilistData = await fetchAnilistData(apiData.anilist);
        if (anilistData?.data?.Media) {
          // Convert AniList score from 0-100 to 0-10 scale
          const normalizedScore = anilistData.data.Media.averageScore ? anilistData.data.Media.averageScore / 10 : null;

          updatePlatformRating(0, {
            score: normalizedScore,
            votes: anilistData.data.Media.popularity,
            detailsUrl: `https://anilist.co/anime/${apiData.anilist}`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(0, { loading: false, error: true });
        }
      }

      // MyAnimeList
      if (apiData.myanimelist) {
        updatePlatformRating(1, { loading: true });
        const malData = await fetchMyAnimeListData(apiData.myanimelist);
        if (malData?.data) {
          updatePlatformRating(1, {
            score: malData.data.score,
            votes: malData.data.scored_by,
            rank: malData.data.rank,
            detailsUrl: `${malData.data.url}/stats`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(1, { loading: false, error: true });
        }
      }

      // IMDb - use direct IMDb ID only
      if (apiData.imdb) {
        updatePlatformRating(2, { loading: true });

        const imdbId = apiData.imdb.startsWith("tt") ? apiData.imdb : `tt${apiData.imdb}`;
        const imdbData = await fetchImdbData(imdbId);
        if (imdbData?.aggregateRating) {
          updatePlatformRating(2, {
            score: imdbData.aggregateRating.ratingValue,
            votes: imdbData.aggregateRating.ratingCount,
            detailsUrl: `https://www.imdb.com/title/${imdbId}/ratings/`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(2, { loading: false, error: true });
        }
      }

      // Kitsu - use rating from mediaInfo if available
      if (apiData.kitsu) {
        updatePlatformRating(3, { loading: true });

        if (mediaInfo?.kitsuRating) {
          // Use the rating already fetched by useMediaInfo
          // Convert Kitsu score from 0-100 to 0-10 scale
          const normalizedScore = mediaInfo.kitsuRating / 10;

          updatePlatformRating(3, {
            score: normalizedScore,
            votes: mediaInfo.kitsuVotes,
            detailsUrl: `https://kitsu.app/anime/${apiData.kitsu}`,
            loading: false,
            error: false,
          });
        } else {
          // Fallback to fetching separately
          const kitsuData = await fetchKitsuData(apiData.kitsu);
          if (kitsuData?.data?.attributes) {
            const averageRating = kitsuData.data.attributes.averageRating
              ? parseFloat(kitsuData.data.attributes.averageRating)
              : null;

            // Calculate total votes from rating frequencies
            let totalVotes = 0;
            if (kitsuData.data.attributes.ratingFrequencies) {
              totalVotes = Object.values(kitsuData.data.attributes.ratingFrequencies).reduce(
                (sum, count) => sum + parseInt(count, 10),
                0,
              );
            }

            // Convert Kitsu score from 0-100 to 0-10 scale
            const normalizedScore = averageRating ? averageRating / 10 : null;

            updatePlatformRating(3, {
              score: normalizedScore,
              votes: totalVotes || null,
              detailsUrl: `https://kitsu.app/anime/${apiData.kitsu}`,
              loading: false,
              error: false,
            });
          } else {
            updatePlatformRating(3, { loading: false, error: true });
          }
        }
      }

      // TMDB - check if we have TMDB ID in API data
      if (apiData.themoviedb) {
        updatePlatformRating(4, { loading: true });
        // For anime, we assume it's a TV show unless specified otherwise
        const mediaType = mediaInfo?.searchMediaType === "anime" ? "tv" : "movie";
        const tmdbData = await fetchTmdbData(apiData.themoviedb, mediaType);
        if (tmdbData) {
          updatePlatformRating(4, {
            score: tmdbData.vote_average,
            votes: tmdbData.vote_count,
            detailsUrl: `https://www.themoviedb.org/${mediaType}/${apiData.themoviedb}`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(4, { loading: false, error: true });
        }
      }

      // AniDB
      if (apiData.anidb) {
        updatePlatformRating(5, { loading: true });
        const anidbData = await fetchAnidbData(apiData.anidb);
        if (anidbData) {
          updatePlatformRating(5, {
            score: anidbData.rating,
            votes: anidbData.votes,
            detailsUrl: `https://anidb.net/anime/${apiData.anidb}/vote/statistic`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(5, { loading: false, error: true });
        }
      }
    };

    fetchAllRatings();
  }, [apiData, mediaInfo, settings.tmdbApiToken]);

  // Format score for display (always out of 10 with 2 decimal places)
  const formatScore = (score: number | null) => {
    if (score === null) return "N/A";
    return score.toFixed(2);
  };

  // Format votes/stats for display with platform-specific labels
  const formatVotesDisplay = (votes: number | null, platform: string) => {
    if (votes === null) return "N/A";

    let formattedNumber: string;
    if (votes >= 1000000) {
      formattedNumber = `${(votes / 1000000).toFixed(1)}M`;
    } else if (votes >= 1000) {
      formattedNumber = `${(votes / 1000).toFixed(1)}K`;
    } else {
      formattedNumber = votes.toString();
    }

    // Use platform-specific labels
    if (platform === "AniList") {
      return `${formattedNumber} saved`;
    }
    return `${formattedNumber} votes`;
  };

  return (
    <div className="ab-ratings box">
      <div className="head">Ratings</div>
      <div className="ab-ratings-grid body">
        {ratings.map((rating) => (
          <div key={rating.platform} className="ab-rating-card">
            <div className="ab-rating-header">
              {rating.detailsUrl && (
                <a
                  href={rating.detailsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ab-rating-details-link"
                  title={`View detailed ${rating.platform} statistics`}
                >
                  <img
                    className="ab-rating-platform-icon"
                    src={PLATFORM_ICONS[rating.platform as keyof typeof PLATFORM_ICONS]}
                    alt={rating.platform}
                    onError={(e) => {
                      // Fallback for missing icons - show platform name instead
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = "none";
                      const fallbackSpan = document.createElement("span");
                      fallbackSpan.textContent = rating.platform;
                      fallbackSpan.className = "ab-platform-name-fallback";
                      target.parentNode?.appendChild(fallbackSpan);
                    }}
                  />
                </a>
              )}
            </div>
            <div className="ab-rating-content">
              {rating.loading ? (
                <div className="ab-rating-loading">Loading...</div>
              ) : rating.error ? (
                <div className="ab-rating-error">Error</div>
              ) : (
                <>
                  <div className="ab-rating-score">
                    <span className="ab-score-value">{formatScore(rating.score)}</span>
                    <span className="ab-score-max"> / 10</span>
                  </div>
                  <div className="ab-rating-details">
                    <div className="ab-rating-votes">{formatVotesDisplay(rating.votes, rating.platform)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
