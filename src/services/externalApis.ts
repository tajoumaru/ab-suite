import { apiRequest } from "@/lib/api";
import { cachedApiCall, setCachedValue } from "@/lib/utils/cache";
import { log } from "@/lib/utils/logging";

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
      apiRequest<JikanAnimeResponse>({
        method: "GET",
        url: `https://api.jikan.moe/v4/anime/${malId}`,
        responseType: "json",
      }),
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours - ratings change infrequently
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "jikan",
    },
  ).catch((error) => {
    log("Failed to fetch Jikan API data", error);
    return null;
  });
}

// Fetch MAL videos data via Jikan API
export async function fetchMalVideosData(malId: number): Promise<JikanVideosResponse | null> {
  const cacheKey = `jikan-videos-${malId}`;
  return cachedApiCall(
    cacheKey,
    () =>
      apiRequest<JikanVideosResponse>({
        method: "GET",
        url: `https://api.jikan.moe/v4/anime/${malId}/videos`,
        responseType: "json",
      }),
    {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - videos change rarely
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "jikan-videos",
    },
  ).catch((error) => {
    log("Failed to fetch Jikan videos API data", error);
    return null;
  });
}

// Fetch AniDB data
export async function fetchAnidbData(anidbId: number): Promise<AnidbAnimeResponse | null> {
  const cacheKey = `anidb-anime-${anidbId}`;
  return cachedApiCall(
    cacheKey,
    () =>
      apiRequest<string>({
        method: "GET",
        url: `http://api.anidb.net:9001/httpapi?client=absuite&clientver=1&protover=1&request=anime&aid=${anidbId}`,
        responseType: "text",
      }).then((responseText) => {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(responseText, "text/xml");
          const ratingElement = xmlDoc.querySelector("ratings > permanent");

          if (ratingElement) {
            const rating = parseFloat(ratingElement.textContent || "0");
            const votes = parseInt(ratingElement.getAttribute("count") || "0", 10);
            return { rating: rating || null, votes: votes || null };
          } else {
            return { rating: null, votes: null };
          }
        } catch (error) {
          log("Failed to parse AniDB API response", error);
          return null;
        }
      }),
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours - ratings change infrequently
      failureTtl: 6 * 60 * 60 * 1000, // 6 hours for failures (AniDB can be flaky)
      apiKey: "anidb",
    },
  ).catch((error) => {
    log("Failed to fetch AniDB API data", error);
    return null;
  });
}

// Fetch Kitsu data
export async function fetchKitsuData(kitsuId: number): Promise<KitsuAnimeResponse | null> {
  const cacheKey = `kitsu-anime-${kitsuId}`;
  return cachedApiCall(
    cacheKey,
    () =>
      apiRequest<KitsuAnimeResponse>({
        method: "GET",
        url: `https://kitsu.app/api/edge/anime/${kitsuId}`,
        headers: {
          Accept: "application/vnd.api+json",
        },
        responseType: "json",
      }),
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours - ratings change infrequently
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "kitsu",
    },
  ).catch((error) => {
    log("Failed to fetch Kitsu API data", error);
    return null;
  });
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
      apiRequest<TmdbResponse>({
        method: "GET",
        url: `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?append_to_response=videos`,
        headers: {
          Authorization: `Bearer ${tmdbApiToken}`,
          Accept: "application/json",
        },
        responseType: "json",
      }),
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "tmdb",
    },
  ).catch((error) => {
    log("Failed to fetch TMDB API data", error);
    return null;
  });
}

// Fetch IMDb data by scraping
export async function fetchImdbData(imdbId: string): Promise<ImdbJsonLd | null> {
  const cacheKey = `imdb-scrape-${imdbId}`;
  return cachedApiCall(
    cacheKey,
    () => {
      const url = `https://www.imdb.com/title/${imdbId}/`;
      return apiRequest<string>({
        method: "GET",
        url,
        responseType: "text",
      }).then((responseText) => {
        try {
          // Extract only the JSON-LD script to avoid loading external resources
          const jsonLdMatch = responseText.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
          if (!jsonLdMatch) {
            log("IMDb JSON-LD script not found");
            return null;
          }

          const jsonData = JSON.parse(jsonLdMatch[1]);

          if (!jsonData.aggregateRating || !jsonData.url) {
            log("Invalid IMDb JSON-LD data", jsonData);
            return null;
          }

          return jsonData;
        } catch (error) {
          log("Failed to parse IMDb page", error);
          return null;
        }
      });
    },
    {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - ratings change slowly
      failureTtl: 6 * 60 * 60 * 1000, // 6 hours for failures
      apiKey: "imdb",
    },
  ).catch((error) => {
    log("Failed to fetch IMDb data", error);
    return null;
  });
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
      async () => {
        const batchResults: Record<string, YouTubeVideoInfo | null> = {};

        try {
          // First get video details for all videos in batch
          const data = await apiRequest<{
            items: Array<{
              id: string;
              snippet: {
                channelId: string;
                title: string;
                description: string;
                publishedAt: string;
                thumbnails: Record<string, { url: string }>;
              };
              status: { embeddable: boolean; privacyStatus: string };
            }>;
          }>({
            method: "GET",
            url: `https://www.googleapis.com/youtube/v3/videos?id=${batch.join(",")}&part=snippet,status&key=${youtubeApiKey}`,
            responseType: "json",
          });
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

          const videoMap = new Map<string, { id: string; snippet: YouTubeVideoSnippet; status: YouTubeVideoStatus }>();

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
          const captionsMap = new Map<string, YouTubeVideoInfo["captions"]>();

          if (videosWithData.length > 0) {
            try {
              const captionsData = await apiRequest<import("@/lib/types").YouTubeCaptionsResponse>({
                method: "GET",
                url: `https://www.googleapis.com/youtube/v3/captions?videoId=${videosWithData.join(",")}&part=snippet&key=${youtubeApiKey}`,
                responseType: "json",
              });

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
              log("Failed to fetch YouTube captions batch response", error);
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

          return batchResults;
        } catch (error) {
          log("Failed to fetch YouTube batch API data", error);
          // Return null for all videos in batch
          for (const videoId of batch) {
            batchResults[videoId] = null;
          }
          return batchResults;
        }
      },
      {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - video info changes rarely
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
    async () => {
      // First get video details
      const videoData = await apiRequest<{
        items: Array<{
          id: string;
          snippet: {
            channelId: string;
            title: string;
            description: string;
            publishedAt: string;
            thumbnails: Record<string, { url: string }>;
          };
          status: { embeddable: boolean; privacyStatus: string };
        }>;
      }>({
        method: "GET",
        url: `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,status&key=${youtubeApiKey}`,
        responseType: "json",
      });

      if (!videoData.items || videoData.items.length === 0) {
        return null;
      }

      const video = videoData.items[0];
      const snippet = video.snippet;
      const status = video.status;

      // Now get captions info
      let captions: YouTubeVideoInfo["captions"] = [];
      try {
        const captionsData = await apiRequest<import("@/lib/types").YouTubeCaptionsResponse>({
          method: "GET",
          url: `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet&key=${youtubeApiKey}`,
          responseType: "json",
        });

        captions =
          captionsData.items?.map((caption) => ({
            languageCode: caption.snippet.language,
            name: caption.snippet.name,
            kind: caption.snippet.trackKind === "ASR" ? "asr" : "standard",
          })) || [];
      } catch (error) {
        log("Failed to fetch YouTube captions", error);
        // Continue without captions
      }

      return {
        id: videoId,
        channelId: snippet.channelId,
        title: snippet.title,
        description: snippet.description,
        publishedAt: snippet.publishedAt,
        thumbnails: snippet.thumbnails,
        captions,
        playable: status.embeddable && status.privacyStatus === "public",
      };
    },
    {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - video info changes rarely
      failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
      apiKey: "youtube",
    },
  ).catch((error) => {
    log("Failed to fetch YouTube API data", error);
    return null;
  });
}
