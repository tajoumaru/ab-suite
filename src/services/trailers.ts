import { log } from "@/utils/logging";
import { fetchMalVideosData, fetchTmdbData, fetchYouTubeVideosInfo, type YouTubeVideoInfo } from "./externalApis";

// Trailer data interfaces
export interface BaseTrailer {
  id: string;
  name: string;
  youtubeId: string;
  provider: {
    name: "TMDB" | "MAL" | "AniList";
    sourceId: string;
  };
  type: string;
  publishedAt?: string;
  official?: boolean;
  youtubeInfo?: YouTubeVideoInfo;
}

export interface TMDBTrailer extends BaseTrailer {
  provider: {
    name: "TMDB";
    sourceId: string;
  };
  iso_639_1: string;
  iso_3166_1: string;
  site: string;
  size: number;
  official: boolean;
  published_at?: string;
}

export interface MALTrailer extends BaseTrailer {
  provider: {
    name: "MAL";
    sourceId: string;
  };
  title: string;
  images?: {
    image_url: string;
    small_image_url: string;
    medium_image_url: string;
    large_image_url: string;
    maximum_image_url: string;
  };
}

export interface AniListTrailer extends BaseTrailer {
  provider: {
    name: "AniList";
    sourceId: string;
  };
  site: string;
}

export type Trailer = TMDBTrailer | MALTrailer | AniListTrailer;

export interface TrailerCollection {
  trailers: Trailer[];
  loading: boolean;
  error: boolean;
}

// Utility functions for trailer classification
export function dubbedInTitle(title: string): boolean {
  return /\bdub(bed)?\b/i.test(title);
}

export function subbedInTitle(title: string): boolean {
  return title.toLowerCase().includes("sub") || title.toLowerCase().includes("eng");
}

export function promotionalVideo(title: string): boolean {
  return title.toLowerCase().includes("promotional video");
}

export function commercial(title: string): boolean {
  return title.toLowerCase().includes("commercial");
}

export function teaser(title: string): boolean {
  return title.toLowerCase().includes("teaser");
}

export function announcement(title: string): boolean {
  return title.toLowerCase().includes("announcement");
}

export function isDubbed(trailer: Trailer): boolean {
  return (
    dubbedInTitle(trailer.name) ||
    (trailer.youtubeInfo
      ? // if it has auto generated English subtitles,
        // it means it probably has english audio
        !!trailer.youtubeInfo.captions?.find((c) => c.languageCode === "en" && c.kind === "asr")
      : false)
  );
}

// Preferred channels for trailer quality assessment
const PREFERRED_CHANNELS = [
  "UC6pGDc4bFGD1_36IKv3FnYg",
  "UCRuJMENPfFiMYoqCXleDLLQ",
  "UCWOA1ZGywLbqmigxE4Qlvuw", // Netflix
];

// Tier sorting utility
function tierSort<T>(items: T[], tiers: Array<(item: T) => boolean>, defaultCompare?: (a: T, b: T) => number): T[] {
  const result = [...items];

  result.sort((a, b) => {
    // Check each tier
    for (let i = 0; i < tiers.length; i++) {
      const aTier = tiers[i](a);
      const bTier = tiers[i](b);

      if (aTier && !bTier) return -1;
      if (!aTier && bTier) return 1;
    }

    // If both items are in the same tier for all criteria, use default compare
    if (defaultCompare) {
      return defaultCompare(a, b);
    }

    return 0;
  });

  return result;
}

// Helper function to check for season/part patterns
const SEASON_PART_REGEX = /\b(season|part|series)\s*\d+\b/i;

// Sort trailers based on preference logic
export async function sortTrailers(
  trailers: Trailer[],
  mediaType: "anime" | "manga" = "anime",
  preferredAudioLanguage: "dubbed" | "subbed" | "any" = "any",
): Promise<Trailer[]> {
  // Check if it's a named season/series that should prefer MAL trailers
  const isNamedSeason = trailers.some(
    (t) => t.provider.name === "MAL" && t.name.includes(":") && SEASON_PART_REGEX.test(t.name),
  );

  const preferMal = mediaType === "anime" && isNamedSeason;

  return tierSort(
    trailers,
    [
      // Prioritize AniList trailers as the main/first option
      (trailer) => trailer.provider.name === "AniList",
      // Prefer MAL for anime seasons/parts
      (trailer) => preferMal && trailer.provider.name === "MAL",
      // Dubs vs subs preference
      (t) => {
        if (preferredAudioLanguage === "any") {
          return false;
        }
        const preferDubbed = preferredAudioLanguage === "dubbed";
        return preferDubbed ? isDubbed(t) : !isDubbed(t);
      },
      // Preferred channels that are (I think) always subbed
      (t) => !!(t.youtubeInfo && PREFERRED_CHANNELS.includes(t.youtubeInfo.channelId)),
      // Try to prefer subs over raw
      (t) =>
        subbedInTitle(t.name) || !!t.youtubeInfo?.captions?.find((c) => c.languageCode === "en" && c.kind !== "asr"),
      // "Regular" trailers
      (t) => !teaser(t.name) && !commercial(t.name) && !promotionalVideo(t.name) && !announcement(t.name),
      // Promotional Videos
      (t) => promotionalVideo(t.name),
      // Teasers
      (t) => teaser(t.name),
      // Commercials and announcements
      (t) => commercial(t.name) || announcement(t.name),
    ],
    (a, b) => {
      // Default compare as last resort to order numbered trailers
      if (a.name < b.name) {
        return -0.1;
      }
      if (a.name > b.name) {
        return 0.1;
      }
      return 0;
    },
  );
}

// Deduplicate trailers based on YouTube ID
export function deduplicateTrailers(trailers: Trailer[]): Trailer[] {
  const seen = new Set<string>();
  const result: Trailer[] = [];

  for (const trailer of trailers) {
    if (!seen.has(trailer.youtubeId)) {
      seen.add(trailer.youtubeId);
      result.push(trailer);
    }
  }

  return result;
}

import type { MALPromo, MALResponse, TMDBVideo, TMDBVideosResponse } from "@/types/external-apis";

// Convert TMDB video data to trailers
export function tmdbVideosToTrailers(tmdbData: TMDBVideosResponse, tmdbId: number): TMDBTrailer[] {
  if (!tmdbData.videos?.results) {
    return [];
  }

  return tmdbData.videos.results
    .filter((video: TMDBVideo) => video.site === "YouTube" && video.type === "Trailer")
    .map(
      (video: TMDBVideo): TMDBTrailer => ({
        id: `tmdb-${video.id}`,
        name: video.name,
        youtubeId: video.key,
        provider: {
          name: "TMDB",
          sourceId: tmdbId.toString(),
        },
        type: video.type,
        publishedAt: video.published_at,
        official: video.official,
        iso_639_1: video.iso_639_1,
        iso_3166_1: video.iso_3166_1,
        site: video.site,
        size: video.size,
        published_at: video.published_at,
      }),
    );
}

// Convert MAL video data to trailers
// Convert AniList trailer data to trailers
export function aniListTrailerToTrailer(
  aniListId: number,
  trailer: { id: string; site: string },
): AniListTrailer | null {
  if (trailer.site !== "youtube") {
    return null; // Only support YouTube trailers for now
  }

  return {
    id: `anilist-trailer-${aniListId}`,
    name: "Official Trailer",
    youtubeId: trailer.id,
    provider: {
      name: "AniList",
      sourceId: aniListId.toString(),
    },
    type: "Trailer",
    site: trailer.site,
  };
}

export function malVideosToTrailers(malData: MALResponse, malId: number): MALTrailer[] {
  const trailers: MALTrailer[] = [];

  // Process promo videos first to build a map of YouTube IDs to titles
  const promoTitleMap = new Map<string, string>();
  if (malData.data?.promo) {
    malData.data.promo.forEach((promo: MALPromo) => {
      if (promo.trailer?.youtube_id && promo.title) {
        // Transform names like legacy code: PV -> Promotional Video, CM -> Commercial
        const transformedName = promo.title.replace(/\bPV\b/gi, "Promotional Video").replace(/\bCM\b/gi, "Commercial");
        promoTitleMap.set(promo.trailer.youtube_id, transformedName);
      }
    });
  }

  // Add main trailer if available, using promo title if it matches
  if (malData.data?.trailer?.youtube_id) {
    const mainTrailerYouTubeId = malData.data.trailer.youtube_id;
    const promoTitle = promoTitleMap.get(mainTrailerYouTubeId);

    trailers.push({
      id: `mal-trailer-${malId}`,
      name: promoTitle || "Official Trailer", // Use promo title if available
      youtubeId: mainTrailerYouTubeId,
      provider: {
        name: "MAL",
        sourceId: malId.toString(),
      },
      type: "Trailer",
      title: promoTitle || "Official Trailer",
    });
  }

  // Add promo videos if available (skip ones that match main trailer)
  if (malData.data?.promo) {
    malData.data.promo.forEach((promo: MALPromo, index: number) => {
      if (promo.trailer?.youtube_id) {
        // Skip if this promo matches the main trailer (already added above)
        if (malData.data?.trailer?.youtube_id === promo.trailer.youtube_id) {
          return;
        }

        // Transform names like legacy code: PV -> Promotional Video, CM -> Commercial
        let transformedName = promo.title || `Promotional Video ${index + 1}`;
        transformedName = transformedName.replace(/\bPV\b/gi, "Promotional Video").replace(/\bCM\b/gi, "Commercial");

        trailers.push({
          id: `mal-promo-${malId}-${index}`,
          name: transformedName,
          youtubeId: promo.trailer.youtube_id || "",
          provider: {
            name: "MAL",
            sourceId: malId.toString(),
          },
          type: "Promotional Video",
          title: transformedName,
          images: promo.trailer.images || undefined,
        });
      }
    });
  }

  return trailers;
}

// Enhanced fetch function that gets MAL videos from the dedicated endpoint
export async function fetchMalTrailerData(malId: number) {
  // First get the main anime data with trailer
  const mainData = await fetchMyAnimeListData(malId);

  // Then get additional videos
  const videosData = await fetchMalVideosData(malId);

  // Combine the data
  const combinedData = {
    data: {
      ...mainData?.data,
      ...videosData?.data,
    },
  };

  return combinedData;
}

// Import AniListService and type
import type { AniListMediaData } from "./anilist";
// Import MAL function from external APIs
import { fetchMyAnimeListData } from "./externalApis";

// Main function to fetch all trailers for a media item
export async function fetchAllTrailers(
  apiData: {
    myanimelist?: number;
    themoviedb?: number;
    anilist?: AniListMediaData;
  },
  mediaType: "anime" | "manga" = "anime",
  tmdbApiToken?: string,
  youtubeApiKey?: string,
): Promise<TrailerCollection> {
  const allTrailers: Trailer[] = [];
  let hasError = false;

  try {
    // Add AniList trailer first (highest priority)
    if (apiData.anilist?.trailer) {
      try {
        const aniListTrailer = aniListTrailerToTrailer(apiData.anilist.id, apiData.anilist.trailer);
        if (aniListTrailer) {
          allTrailers.push(aniListTrailer);
        }
      } catch (error) {
        log("Failed to process AniList trailer", error);
        hasError = true;
      }
    }

    // Fetch TMDB trailers
    if (apiData.themoviedb && tmdbApiToken) {
      try {
        const tmdbMediaType = mediaType === "anime" ? "tv" : "movie";
        const tmdbData = await fetchTmdbData(apiData.themoviedb, tmdbMediaType, tmdbApiToken);
        if (tmdbData) {
          const tmdbTrailers = tmdbVideosToTrailers(tmdbData, apiData.themoviedb);
          allTrailers.push(...tmdbTrailers);
        }
      } catch (error) {
        log("Failed to fetch TMDB trailers", error);
        hasError = true;
      }
    }

    // Fetch MAL trailers
    if (apiData.myanimelist) {
      try {
        const malData = await fetchMalTrailerData(apiData.myanimelist);
        if (malData) {
          const malTrailers = malVideosToTrailers(malData, apiData.myanimelist);
          allTrailers.push(...malTrailers);
        }
      } catch (error) {
        log("Failed to fetch MAL trailers", error);
        hasError = true;
      }
    }

    // Deduplicate trailers
    const uniqueTrailers = deduplicateTrailers(allTrailers);

    // Fetch YouTube info for playability and captions if API key is available
    if (youtubeApiKey && uniqueTrailers.length > 0) {
      try {
        // Collect all YouTube IDs
        const youtubeIds = uniqueTrailers.map((t) => t.youtubeId);

        // Batch fetch YouTube info
        const youtubeInfoMap = await fetchYouTubeVideosInfo(youtubeIds, youtubeApiKey);

        // Assign YouTube info to trailers
        for (const trailer of uniqueTrailers) {
          const youtubeInfo = youtubeInfoMap.get(trailer.youtubeId);
          if (youtubeInfo) {
            trailer.youtubeInfo = youtubeInfo;
          }
        }
      } catch (error) {
        log("Failed to fetch YouTube info batch", error);
        // Don't mark as error since this is optional enhancement
      }
    }

    // Sort trailers by preference
    const sortedTrailers = await sortTrailers(uniqueTrailers, mediaType);

    return {
      trailers: sortedTrailers,
      loading: false,
      error: hasError,
    };
  } catch (error) {
    log("Failed to fetch trailers", error);
    return {
      trailers: [],
      loading: false,
      error: true,
    };
  }
}
