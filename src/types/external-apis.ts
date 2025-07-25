/**
 * Type definitions for external API responses
 */

// TMDB API types
export interface TMDBVideo {
  id: string;
  name: string;
  key: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
  iso_639_1: string;
  iso_3166_1: string;
  size: number;
}

export interface TMDBVideosResponse {
  videos?: {
    results: TMDBVideo[];
  };
}

// MAL API types
export interface MALTrailerInfo {
  youtube_id: string | null;
  url?: string | null;
  embed_url?: string | null;
  images?: {
    image_url: string;
    small_image_url: string;
    medium_image_url: string;
    large_image_url: string;
    maximum_image_url: string;
  };
}

export interface MALPromo {
  title: string;
  trailer?: MALTrailerInfo;
}

export interface MALData {
  trailer?: MALTrailerInfo;
  promo?: MALPromo[];
}

export interface MALResponse {
  data?: MALData;
}

// YouTube API types
export interface YouTubeCaptionSnippet {
  videoId: string;
  language: string;
  name: string;
  trackKind: string;
}

export interface YouTubeCaption {
  snippet: YouTubeCaptionSnippet;
}

export interface YouTubeCaptionsResponse {
  items?: YouTubeCaption[];
}

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status?: number;
}
