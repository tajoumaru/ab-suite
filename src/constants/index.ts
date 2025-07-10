/**
 * Application-wide constants to replace magic numbers and strings
 */

// Time constants (in milliseconds)
export const TIME_CONSTANTS = {
  /** Default cache TTL: 24 hours */
  CACHE_DEFAULT_TTL_MS: 24 * 60 * 60 * 1000,

  /** Cache TTL for failed requests: 1 hour */
  CACHE_FAILURE_TTL_MS: 60 * 60 * 1000,

  /** Long-term cache TTL: 7 days */
  CACHE_LONG_TTL_MS: 7 * 24 * 60 * 60 * 1000,

  /** Short-term cache TTL: 12 hours */
  CACHE_SHORT_TTL_MS: 12 * 60 * 60 * 1000,

  /** Debounce delay for search: 200ms */
  SEARCH_DEBOUNCE_MS: 200,

  /** Animation duration: 150ms */
  ANIMATION_DURATION_MS: 150,

  /** Request timeout: 10 seconds */
  REQUEST_TIMEOUT_MS: 10 * 1000,

  /** Retry delay base: 1 second */
  RETRY_BASE_DELAY_MS: 1000,
} as const;

// Aspect ratio constants
export const ASPECT_RATIOS = {
  /** Standard 4:3 aspect ratio */
  STANDARD: 4 / 3,

  /** Widescreen 16:9 aspect ratio */
  WIDESCREEN: 16 / 9,

  /** Cinema 1.85:1 aspect ratio */
  CINEMA_1: 1.85,

  /** Cinema 2.35:1 aspect ratio */
  CINEMA_2: 2.35,

  /** Ultra-wide 21:9 aspect ratio */
  ULTRAWIDE: 21 / 9,
} as const;

// DOM constants
export const DOM_CONSTANTS = {
  /** Maximum colspan value for table cells */
  MAX_COLSPAN: 100,

  /** Default item height for virtual scrolling */
  DEFAULT_ITEM_HEIGHT: 50,

  /** Buffer size for virtual scrolling */
  VIRTUAL_SCROLL_BUFFER: 5,

  /** Maximum autocomplete results to show */
  MAX_AUTOCOMPLETE_RESULTS: 10,

  /** Maximum cache size for autocomplete */
  MAX_AUTOCOMPLETE_CACHE_SIZE: 200,
} as const;

// Color constants
export const COLORS = {
  /** Active color for anime/music navigation */
  ANIME_MUSIC_ACTIVE: "#0090ff",

  /** Active color for subcategories */
  SUBCATEGORIES_ACTIVE: "#fe2a73",

  /** Success color */
  SUCCESS: "#10b981",

  /** Error color */
  ERROR: "#ef4444",

  /** Warning color */
  WARNING: "#f59e0b",

  /** Info color */
  INFO: "#3b82f6",
} as const;

// API constants
export const API_CONSTANTS = {
  /** Maximum number of retry attempts */
  MAX_RETRY_ATTEMPTS: 3,

  /** Rate limit: requests per minute */
  RATE_LIMIT_REQUESTS_PER_MINUTE: 60,

  /** Maximum request queue size */
  MAX_REQUEST_QUEUE_SIZE: 100,

  /** User agent for API requests */
  USER_AGENT: "ABSuite/0.7.0",
} as const;

// Media format constants
export const MEDIA_FORMATS = {
  /** Valid video formats */
  VIDEO_FORMATS: ["MKV", "MP4", "AVI", "VOB", "VOB IFO", "TS", "M2TS", "FLV", "RMVB", "WMV", "MOV", "WEBM"] as const,

  /** Valid video codecs */
  VIDEO_CODECS: [
    "h264",
    "h264 10-bit",
    "h265",
    "h265 10-bit",
    "h265 12-bit",
    "AVC",
    "AVC-10b",
    "HEVC",
    "HEVC-10b",
    "HEVC-12b",
    "XviD",
    "DivX",
    "WMV",
    "MPEG-1/2",
    "VC-1",
    "VP9",
    "AV1",
  ] as const,

  /** Valid audio codecs */
  AUDIO_CODECS: [
    "MP3",
    "AAC",
    "AC3",
    "DTS",
    "DTS-HD",
    "DTS-HD MA",
    "TrueHD",
    "FLAC",
    "PCM",
    "Vorbis",
    "Opus",
    "WMA",
    "MP2",
    "WAV",
  ] as const,

  /** Valid regions for anime/movies */
  REGIONS: [
    "A",
    "B",
    "C",
    "R1",
    "R2",
    "R3",
    "R4",
    "R5",
    "R6",
    "R2 Japan",
    "R2 Europe",
    "NTSC-J",
    "NTSC-U",
    "PAL",
  ] as const,

  /** Valid music codecs */
  MUSIC_CODECS: ["AAC", "MP3", "FLAC"] as const,

  /** Valid music bitrates */
  MUSIC_BITRATES: ["192", "V2 (VBR)", "256", "V0 (VBR)", "320", "Lossless", "Lossless 24-bit"] as const,

  /** Valid music media types */
  MUSIC_MEDIA: ["CD", "DVD", "Blu-ray", "Cassette", "Vinyl", "Soundboard", "Web", "SACD"] as const,

  /** Valid game platforms */
  GAME_PLATFORMS: [
    "PC",
    "PS2",
    "PSP",
    "PSX",
    "GameCube",
    "Wii",
    "GBA",
    "NDS",
    "N64",
    "SNES",
    "NES",
    "Dreamcast",
    "PS3",
    "3DS",
    "PS Vita",
    "Switch",
    "PS4",
    "PS5",
    "Xbox",
    "Xbox 360",
    "Xbox One",
    "Xbox Series",
  ] as const,

  /** Valid printed media formats */
  PRINTED_FORMATS: ["EPUB", "PDF", "Archived Scans", "CBZ", "CBR"] as const,
} as const;

// Resolution constants
export const RESOLUTIONS = {
  /** Common video resolutions */
  STANDARD_RESOLUTIONS: {
    "480p": "720x480",
    "480i": "720x480",
    "576p": "720x576",
    "576i": "720x576",
    "720p": "1280x720",
    "720i": "1280x720",
    "1080p": "1920x1080",
    "1080i": "1920x1080",
    "1440p": "2560x1440",
    "2160p": "3840x2160",
    "4K": "3840x2160",
    "8K": "7680x4320",
  } as const,

  /** Resolution quality tiers */
  QUALITY_TIERS: {
    SD: ["720x480", "720x576"],
    HD: ["1280x720"],
    FHD: ["1920x1080"],
    QHD: ["2560x1440"],
    UHD: ["3840x2160", "7680x4320"],
  } as const,
} as const;

// File size constants
export const FILE_SIZE = {
  /** File size units in bytes */
  UNITS: {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  } as const,

  /** Typical size ranges for quality assessment */
  QUALITY_RANGES: {
    SD_MIN_MB: 100,
    SD_MAX_MB: 1000,
    HD_MIN_MB: 500,
    HD_MAX_MB: 3000,
    FHD_MIN_MB: 1000,
    FHD_MAX_MB: 10000,
  } as const,
} as const;

// Settings constants
export const SETTINGS = {
  /** Settings key prefix for GM storage */
  KEY_PREFIX: "ab-suite-",

  /** Default settings update debounce */
  UPDATE_DEBOUNCE_MS: 300,

  /** Maximum settings history entries */
  MAX_HISTORY_ENTRIES: 50,
} as const;

// Table constants
export const TABLE_CONSTANTS = {
  /** Default number of rows to render in virtual scrolling */
  DEFAULT_VISIBLE_ROWS: 20,

  /** Row height for virtual scrolling */
  ROW_HEIGHT: 32,

  /** Header height */
  HEADER_HEIGHT: 40,

  /** Maximum columns to display */
  MAX_COLUMNS: 20,
} as const;

// SeaDex constants
export const SEADEX = {
  /** SeaDex API base URL */
  API_BASE_URL: "https://releases.moe/api",

  /** Cache TTL for SeaDex data */
  CACHE_TTL_MS: TIME_CONSTANTS.CACHE_LONG_TTL_MS,

  /** Request timeout for SeaDex API */
  REQUEST_TIMEOUT_MS: 5000,
} as const;

// External API constants
export const EXTERNAL_APIS = {
  /** AniList GraphQL endpoint */
  ANILIST_ENDPOINT: "https://graphql.anilist.co",

  /** TMDB API base URL */
  TMDB_BASE_URL: "https://api.themoviedb.org/3",

  /** YouTube API base URL */
  YOUTUBE_BASE_URL: "https://www.googleapis.com/youtube/v3",

  /** MyAnimeList API base URL */
  MAL_BASE_URL: "https://api.myanimelist.net/v2",

  /** IMDb base URL for scraping */
  IMDB_BASE_URL: "https://www.imdb.com",

  /** Default request timeout for external APIs */
  DEFAULT_TIMEOUT_MS: TIME_CONSTANTS.REQUEST_TIMEOUT_MS,
} as const;
