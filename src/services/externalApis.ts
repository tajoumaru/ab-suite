import { cachedApiCall, setCachedValue } from "@/utils/cache";
import { log } from "@/utils/logging";

// API Response Interfaces
export interface JikanAnimeResponse {
  data: {
    score: number | null;
    scored_by: number | null;
    rank: number | null;
    url: string;
    trailer?: {
      youtube_id: string | null;
      url: string | null;
      embed_url: string | null;
    };
  };
}

export interface JikanVideosResponse {
  data: {
    promo: Array<{
      title: string;
      trailer: {
        youtube_id: string;
        url: string;
        embed_url: string;
        images: {
          image_url: string;
          small_image_url: string;
          medium_image_url: string;
          large_image_url: string;
          maximum_image_url: string;
        };
      };
    }>;
  };
}

export interface AnidbAnimeResponse {
  rating: number | null;
  votes: number | null;
}

export interface AnilistAnimeResponse {
  data: {
    Media: {
      id: number;
      averageScore: number | null;
      popularity: number | null;
      stats: {
        scoreDistribution: Array<{
          score: number;
          amount: number;
        }>;
      } | null;
    };
  };
}

export interface KitsuAnimeResponse {
  data: {
    attributes: {
      averageRating: string | null;
      ratingFrequencies: { [key: string]: string } | null;
    };
  };
}

export interface TmdbResponse {
  vote_average: number;
  vote_count: number;
  id: number;
  external_ids?: {
    imdb_id: string;
  };
  videos?: {
    results: Array<{
      iso_639_1: string;
      iso_3166_1: string;
      name: string;
      key: string;
      site: string;
      size: number;
      type: string;
      official: boolean;
      published_at: string;
      id: string;
    }>;
  };
}

export interface ImdbJsonLd {
  url: string;
  aggregateRating: {
    ratingValue: number;
    ratingCount: number;
  };
}

export interface YouTubeVideoInfo {
  id: string;
  channelId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
    standard?: { url: string };
    maxres?: { url: string };
  };
  captions: Array<{
    languageCode: string;
    name: string;
    kind: string; // "asr" for auto-generated, "standard" for manual
  }>;
  playable: boolean;
}

// Fetch MyAnimeList data via Jikan API
export async function fetchMyAnimeListData(malId: number): Promise<JikanAnimeResponse | null> {
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
                log("Failed to parse Jikan API response", error);
                resolve(null);
              }
            } else {
              log("Jikan API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch Jikan API data");
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
}

// Fetch MAL videos data via Jikan API
export async function fetchMalVideosData(malId: number): Promise<JikanVideosResponse | null> {
  const cacheKey = `jikan-videos-${malId}`;
  return cachedApiCall(
    cacheKey,
    () =>
      new Promise<JikanVideosResponse | null>((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: `https://api.jikan.moe/v4/anime/${malId}/videos`,
          onload: (response) => {
            if (response.status === 200) {
              try {
                const data = JSON.parse(response.responseText);
                resolve(data);
              } catch (error) {
                log("Failed to parse Jikan videos API response", error);
                resolve(null);
              }
            } else {
              log("Jikan videos API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch Jikan videos API data");
            resolve(null);
          },
        });
      }),
    {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - videos change rarely
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "jikan-videos",
    },
  );
}

// Fetch AniDB data
export async function fetchAnidbData(anidbId: number): Promise<AnidbAnimeResponse | null> {
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
                log("Failed to parse AniDB API response", error);
                resolve(null);
              }
            } else {
              log("AniDB API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch AniDB API data");
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
}

// Fetch AniList data via GraphQL
export async function fetchAnilistData(anilistId: number): Promise<AnilistAnimeResponse | null> {
  const cacheKey = `anilist-anime-${anilistId}`;

  const query = /*gql*/ `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        id
        averageScore
        popularity
        stats {
          scoreDistribution {
            score
            amount
          }
        }
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
                log("Failed to parse AniList API response", error);
                resolve(null);
              }
            } else {
              log("AniList API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch AniList API data");
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
}

// Fetch Kitsu data
export async function fetchKitsuData(kitsuId: number): Promise<KitsuAnimeResponse | null> {
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
                log("Failed to parse Kitsu API response", error);
                resolve(null);
              }
            } else {
              log("Kitsu API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch Kitsu API data");
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
}

// Fetch TMDB data (updated to include videos)
export async function fetchTmdbData(
  tmdbId: number,
  mediaType: "movie" | "tv",
  tmdbApiToken: string,
): Promise<TmdbResponse | null> {
  const cacheKey = `tmdb-${mediaType}-${tmdbId}`;
  return cachedApiCall(
    cacheKey,
    () =>
      new Promise<TmdbResponse | null>((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?append_to_response=videos`,
          headers: {
            Authorization: `Bearer ${tmdbApiToken}`,
            Accept: "application/json",
          },
          onload: (response) => {
            if (response.status === 200) {
              try {
                const data = JSON.parse(response.responseText);
                resolve(data);
              } catch (error) {
                log("Failed to parse TMDB API response", error);
                resolve(null);
              }
            } else {
              log("TMDB API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch TMDB API data");
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
}

// Fetch IMDb data by scraping
export async function fetchImdbData(imdbId: string): Promise<ImdbJsonLd | null> {
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
                  log("IMDb JSON-LD script not found");
                  resolve(null);
                  return;
                }

                const jsonData = JSON.parse(jsonLdMatch[1]);

                if (!jsonData.aggregateRating || !jsonData.url) {
                  log("Invalid IMDb JSON-LD data", jsonData);
                  resolve(null);
                  return;
                }

                resolve(jsonData);
              } catch (error) {
                log("Failed to parse IMDb page", error);
                resolve(null);
              }
            } else {
              log("IMDb returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch IMDb data");
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
}

// Batch fetch YouTube video info for multiple videos (up to 50 at a time)
export async function fetchYouTubeVideosInfo(
  videoIds: string[],
  youtubeApiKey: string,
): Promise<Map<string, YouTubeVideoInfo | null>> {
  const results = new Map<string, YouTubeVideoInfo | null>();

  // YouTube API allows up to 50 video IDs per request
  const batchSize = 50;
  const batches: string[][] = [];

  for (let i = 0; i < videoIds.length; i += batchSize) {
    batches.push(videoIds.slice(i, i + batchSize));
  }

  // Process each batch
  for (const batch of batches) {
    const batchCacheKey = `youtube-videos-${batch.join(",")}`;
    const batchResult = await cachedApiCall(
      batchCacheKey,
      () =>
        new Promise<Record<string, YouTubeVideoInfo | null>>((resolve) => {
          const batchResults: Record<string, YouTubeVideoInfo | null> = {};

          // First get video details for all videos in batch
          GM_xmlhttpRequest({
            method: "GET",
            url: `https://www.googleapis.com/youtube/v3/videos?id=${batch.join(",")}&part=snippet,status&key=${youtubeApiKey}`,
            onload: async (response) => {
              if (response.status === 200) {
                try {
                  const data = JSON.parse(response.responseText);
                  interface YouTubeVideoSnippet {
                    channelId: string;
                    title: string;
                    description: string;
                    publishedAt: string;
                    thumbnails: Record<string, { url: string }>;
                  }

                  interface YouTubeVideoStatus {
                    embeddable: boolean;
                    privacyStatus: string;
                  }

                  const videoMap = new Map<
                    string,
                    { id: string; snippet: YouTubeVideoSnippet; status: YouTubeVideoStatus }
                  >();

                  // Process video data
                  if (data.items && Array.isArray(data.items)) {
                    for (const video of data.items) {
                      videoMap.set(video.id, video);
                    }
                  }

                  // Set null for videos not found
                  for (const videoId of batch) {
                    if (!videoMap.has(videoId)) {
                      batchResults[videoId] = null;
                    }
                  }

                  // Now get captions for all videos in one request
                  const videosWithData = Array.from(videoMap.keys());
                  if (videosWithData.length > 0) {
                    GM_xmlhttpRequest({
                      method: "GET",
                      url: `https://www.googleapis.com/youtube/v3/captions?videoId=${videosWithData.join(",")}&part=snippet&key=${youtubeApiKey}`,
                      onload: (captionsResponse) => {
                        const captionsMap = new Map<string, YouTubeVideoInfo["captions"]>();

                        if (captionsResponse.status === 200) {
                          try {
                            const captionsData = JSON.parse(
                              captionsResponse.responseText,
                            ) as import("@/types/external-apis").YouTubeCaptionsResponse;

                            // Group captions by video ID
                            if (captionsData.items && Array.isArray(captionsData.items)) {
                              for (const caption of captionsData.items) {
                                const videoId = caption.snippet.videoId;
                                if (!captionsMap.has(videoId)) {
                                  captionsMap.set(videoId, []);
                                }
                                const captions = captionsMap.get(videoId);
                                if (captions) {
                                  captions.push({
                                    languageCode: caption.snippet.language,
                                    name: caption.snippet.name,
                                    kind: caption.snippet.trackKind === "ASR" ? "asr" : "standard",
                                  });
                                }
                              }
                            }
                          } catch (error) {
                            log("Failed to parse YouTube captions batch response", error);
                          }
                        }

                        // Build final results
                        for (const [videoId, video] of videoMap) {
                          const snippet = video.snippet;
                          const status = video.status;

                          batchResults[videoId] = {
                            id: videoId,
                            channelId: snippet.channelId,
                            title: snippet.title,
                            description: snippet.description,
                            publishedAt: snippet.publishedAt,
                            thumbnails: snippet.thumbnails,
                            captions: captionsMap.get(videoId) || [],
                            playable: status.embeddable && status.privacyStatus === "public",
                          };
                        }

                        resolve(batchResults);
                      },
                      onerror: () => {
                        // If captions fetch fails, still return video info without captions
                        for (const [videoId, video] of videoMap) {
                          const snippet = video.snippet;
                          const status = video.status;

                          batchResults[videoId] = {
                            id: videoId,
                            channelId: snippet.channelId,
                            title: snippet.title,
                            description: snippet.description,
                            publishedAt: snippet.publishedAt,
                            thumbnails: snippet.thumbnails,
                            captions: [],
                            playable: status.embeddable && status.privacyStatus === "public",
                          };
                        }

                        resolve(batchResults);
                      },
                    });
                  } else {
                    resolve(batchResults);
                  }
                } catch (error) {
                  log("Failed to parse YouTube batch API response", error);
                  // Return null for all videos in batch
                  for (const videoId of batch) {
                    batchResults[videoId] = null;
                  }
                  resolve(batchResults);
                }
              } else {
                log("YouTube batch API returned status", response.status);
                // Return null for all videos in batch
                for (const videoId of batch) {
                  batchResults[videoId] = null;
                }
                resolve(batchResults);
              }
            },
            onerror: () => {
              log("Failed to fetch YouTube batch API data");
              // Return null for all videos in batch
              for (const videoId of batch) {
                batchResults[videoId] = null;
              }
              resolve(batchResults);
            },
          });
        }),
      {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - video info changes rarely
        failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
        apiKey: "youtube",
      },
    );

    // Merge batch results into main results
    if (batchResult) {
      for (const [videoId, info] of Object.entries(batchResult)) {
        results.set(videoId, info);
        // Also cache individual results
        if (info) {
          await setCachedValue(`youtube-video-${videoId}`, info, {
            ttl: 7 * 24 * 60 * 60 * 1000,
          });
        }
      }
    }
  }

  return results;
}

// Fetch YouTube video info (requires YouTube API key)
export async function fetchYouTubeVideoInfo(videoId: string, youtubeApiKey: string): Promise<YouTubeVideoInfo | null> {
  const cacheKey = `youtube-video-${videoId}`;
  return cachedApiCall(
    cacheKey,
    () =>
      new Promise<YouTubeVideoInfo | null>((resolve) => {
        // First get video details
        GM_xmlhttpRequest({
          method: "GET",
          url: `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,status&key=${youtubeApiKey}`,
          onload: (response) => {
            if (response.status === 200) {
              try {
                const data = JSON.parse(response.responseText);
                if (!data.items || data.items.length === 0) {
                  resolve(null);
                  return;
                }

                const video = data.items[0];
                const snippet = video.snippet;
                const status = video.status;

                // Now get captions info
                GM_xmlhttpRequest({
                  method: "GET",
                  url: `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet&key=${youtubeApiKey}`,
                  onload: (captionsResponse) => {
                    let captions: YouTubeVideoInfo["captions"] = [];

                    if (captionsResponse.status === 200) {
                      try {
                        const captionsData = JSON.parse(
                          captionsResponse.responseText,
                        ) as import("@/types/external-apis").YouTubeCaptionsResponse;
                        captions =
                          captionsData.items?.map((caption) => ({
                            languageCode: caption.snippet.language,
                            name: caption.snippet.name,
                            kind: caption.snippet.trackKind === "ASR" ? "asr" : "standard",
                          })) || [];
                      } catch (error) {
                        log("Failed to parse YouTube captions response", error);
                      }
                    }

                    resolve({
                      id: videoId,
                      channelId: snippet.channelId,
                      title: snippet.title,
                      description: snippet.description,
                      publishedAt: snippet.publishedAt,
                      thumbnails: snippet.thumbnails,
                      captions,
                      playable: status.embeddable && status.privacyStatus === "public",
                    });
                  },
                  onerror: () => {
                    // If captions fetch fails, still return video info without captions
                    resolve({
                      id: videoId,
                      channelId: snippet.channelId,
                      title: snippet.title,
                      description: snippet.description,
                      publishedAt: snippet.publishedAt,
                      thumbnails: snippet.thumbnails,
                      captions: [],
                      playable: status.embeddable && status.privacyStatus === "public",
                    });
                  },
                });
              } catch (error) {
                log("Failed to parse YouTube API response", error);
                resolve(null);
              }
            } else {
              log("YouTube API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch YouTube API data");
            resolve(null);
          },
        });
      }),
    {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - video info changes rarely
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "youtube",
    },
  );
}
