import type { Settings } from "./settings";

export type SettingType = "boolean" | "string" | "number" | "select";

export type SettingValue = boolean | string | number;

export interface SettingConfig {
  key: keyof Settings;
  label: string;
  description: string;
  type: SettingType;
  category: string;
  requiresReload?: boolean;
  placeholder?: string;
  helpUrl?: string;
  options?: { value: SettingValue; label: string }[];
  validation?: (value: SettingValue) => boolean;
  dependencies?: {
    setting: keyof Settings;
    value: SettingValue;
  }[];
}

export interface SettingCategory {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  order: number;
}

export const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: "navigation",
    label: "Navigation & Discovery",
    description: "Search, navigation, and content discovery features",
    icon: "🎯",
    order: 1,
  },
  {
    id: "metadata",
    label: "Metadata & Ratings",
    description: "External integrations for enhanced metadata and ratings",
    icon: "📊",
    order: 2,
  },
  {
    id: "media",
    label: "Media Features",
    description: "Video, trailer, and media-related functionality",
    icon: "🎬",
    order: 3,
  },
  {
    id: "table",
    label: "Table Display",
    description: "Configure torrent table layout and display options",
    icon: "📊",
    order: 4,
  },
  {
    id: "visual",
    label: "Visual Settings",
    description: "Customize the appearance and layout of content",
    icon: "🎨",
    order: 5,
  },
  {
    id: "api",
    label: "API Configuration",
    description: "Configure external API credentials and keys",
    icon: "🔐",
    order: 6,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Developer and debugging options",
    icon: "⚙️",
    order: 7,
  },
];

export const SETTINGS_CONFIG: SettingConfig[] = [
  // Navigation & Discovery
  {
    key: "tableRestructureEnabled",
    label: "Modern Table Layout",
    description: "Restructures torrent tables with organized columns for format info",
    type: "boolean",
    category: "table",
    requiresReload: true,
  },
  {
    key: "autocompleteSearchEnabled",
    label: "Search Autocomplete",
    description: "Adds autocomplete functionality to search bars with keyboard navigation and caching",
    type: "boolean",
    category: "navigation",
  },
  {
    key: "interactiveSearchEnabled",
    label: "Interactive Search Categories",
    description:
      "Highlights current categories and preserves search parameters when switching between Anime and Music sections",
    type: "boolean",
    category: "navigation",
  },
  {
    key: "quickNavigationEnabled",
    label: "Quick Navigation",
    description: "Adds a navigation sidebar on series and artist pages with links to all content categories and groups",
    type: "boolean",
    category: "navigation",
    requiresReload: true,
  },
  {
    key: "readMoreEnabled",
    label: "Read More Links",
    description: "Adds 'Read all' links to truncated torrent descriptions that expand to show the full description",
    type: "boolean",
    category: "navigation",
  },

  // Metadata & Ratings
  {
    key: "anilistIntegrationEnabled",
    label: "AniList Integration",
    description: "Adds AB buttons to AniList and AniList/MD links to AB",
    type: "boolean",
    category: "metadata",
    requiresReload: true,
  },
  {
    key: "aniListMetadataEnabled",
    label: "AniList Metadata Enhancement",
    description:
      "Replace basic metadata sections with enhanced AniList data including improved synopsis, extended info, and character cards with images",
    type: "boolean",
    category: "metadata",
    requiresReload: true,
  },
  {
    key: "RatingsEnabled",
    label: "Comprehensive Ratings",
    description: "Shows ratings from AniDB, AniList, Kitsu, MyAnimeList, TMDB, and IMDb with detailed score breakdowns",
    type: "boolean",
    category: "metadata",
    requiresReload: true,
  },
  {
    key: "seadexEnabled",
    label: "SeaDex Integration",
    description: "Tags recommended releases on torrent pages",
    type: "boolean",
    category: "metadata",
    requiresReload: true,
  },
  {
    key: "relationsBoxEnabled",
    label: "Relations Box",
    description: "Shows related anime/manga entries (prequels, sequels, adaptations) on torrent pages",
    type: "boolean",
    category: "metadata",
    requiresReload: true,
  },
  {
    key: "characterPageEnhancements",
    label: "Character Page Enhancements",
    description: "Adds character images and descriptions from AniList/MAL to character pages",
    type: "boolean",
    category: "metadata",
    requiresReload: true,
  },
  {
    key: "collageTableEnhancements",
    label: "Collage Table Grid Layout",
    description: "Replaces table-based collage layouts with modern CSS grid on character pages",
    type: "boolean",
    category: "visual",
    requiresReload: true,
    dependencies: [{ setting: "characterPageEnhancements", value: true }],
  },

  // Media Features
  {
    key: "mediainfoParserEnabled",
    label: "MediaInfo Parser",
    description: "Uses MediaInfo data to correct potentially mislabeled torrent information with actual file specs",
    type: "boolean",
    category: "media",
  },
  {
    key: "TrailersEnabled",
    label: "Trailers",
    description: "Show trailers from YouTube when available",
    type: "boolean",
    category: "media",
    requiresReload: true,
  },
  {
    key: "youtubePrivacyModeEnabled",
    label: "YouTube Privacy Mode",
    description: "Use youtube-nocookie.com for enhanced privacy (may disable some player features)",
    type: "boolean",
    category: "media",
    dependencies: [{ setting: "TrailersEnabled", value: true }],
  },
  {
    key: "youtubeOverlayHidingEnabled",
    label: "Hide YouTube Video Overlays",
    description: "Hides related videos and pause overlays when YouTube videos are embedded from AB Suite",
    type: "boolean",
    category: "media",
    dependencies: [{ setting: "TrailersEnabled", value: true }],
  },

  // Visual Settings
  {
    key: "galleryViewEnabled",
    label: "Gallery View",
    description: "Adds a gallery view option to torrent search pages with cover images, tags, and descriptions",
    type: "boolean",
    category: "visual",
    requiresReload: true,
  },
  {
    key: "enhancedTagStylingEnabled",
    label: "Enhanced Tag Styling",
    description:
      "Transforms tag display (e.g., 'school.life' → 'School Life') with color coding across the entire site",
    type: "boolean",
    category: "visual",
    requiresReload: true,
  },
  {
    key: "treeFilelistEnabled",
    label: "Tree-Style Filelist",
    description: "Displays filelists in a tree structure with folders and files, similar to U2's filelist",
    type: "boolean",
    category: "visual",
    requiresReload: true,
  },
  {
    key: "enhancedBbcodeToolbarEnabled",
    label: "Enhanced BBCode Toolbar",
    description: "Replaces default BBCode toolbar with modern icons and improved styling",
    type: "boolean",
    category: "visual",
    requiresReload: true,
  },
  {
    key: "seriesTitlesEnabled",
    label: "Series Titles Display",
    description: "Shows series titles below images on the airing schedule page for better readability",
    type: "boolean",
    category: "visual",
    requiresReload: true,
  },
  {
    key: "sectionsCollapsedByDefault",
    label: "Load Sections Collapsed",
    description: "When enabled, torrent table sections and groups will load collapsed by default",
    type: "boolean",
    category: "table",
    dependencies: [{ setting: "tableRestructureEnabled", value: true }],
  },
  {
    key: "compactResolutionMode",
    label: "Compact Resolution Display",
    description: "Shows resolution as width×height instead of separate aspect ratio and resolution columns",
    type: "boolean",
    category: "table",
    dependencies: [{ setting: "tableRestructureEnabled", value: true }],
  },
  {
    key: "showRegionColumn",
    label: "Show Region Column",
    description: "Displays the region column (R1, R2, A, B, etc.) in the modern table layout",
    type: "boolean",
    category: "table",
    dependencies: [{ setting: "tableRestructureEnabled", value: true }],
  },
  {
    key: "showDualAudioColumn",
    label: "Show Dual Audio Column",
    description: "Displays the dual audio column (checkmark/X indicator) in the modern table layout",
    type: "boolean",
    category: "table",
    dependencies: [{ setting: "tableRestructureEnabled", value: true }],
  },

  // API Configuration
  {
    key: "simklClientId",
    label: "SIMKL Client ID",
    description: "Optional API key for SIMKL integration to fetch additional IDs (TMDB, IMDB)",
    type: "string",
    category: "api",
    placeholder: "Enter SIMKL Client ID (optional)",
    helpUrl: "https://simkl.com/settings/developer",
  },
  {
    key: "tmdbApiToken",
    label: "TMDB API Token",
    description: "Required for TMDB ratings in Comprehensive Ratings",
    type: "string",
    category: "api",
    placeholder: "Enter TMDB API Bearer Token (required for TMDB/IMDb ratings)",
    helpUrl: "https://themoviedb.org/settings/api",
    dependencies: [{ setting: "RatingsEnabled", value: true }],
  },
  {
    key: "youtubeApiKey",
    label: "YouTube API Key",
    description: "Required for fetching trailers from YouTube",
    type: "string",
    category: "api",
    placeholder: "Enter YouTube API Key (required for trailers)",
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    dependencies: [{ setting: "TrailersEnabled", value: true }],
  },

  // Advanced
  {
    key: "debugLoggingEnabled",
    label: "Debug Logging",
    description: "Enables debug logging for troubleshooting purposes",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "disableCaching",
    label: "Disable API Caching",
    description: "Disables caching for all API requests (may impact performance and increase API usage)",
    type: "boolean",
    category: "advanced",
  },
];

// Helper functions
export function getSettingsByCategory(category: string): SettingConfig[] {
  return SETTINGS_CONFIG.filter((setting) => setting.category === category);
}

export function getSettingConfig(key: keyof Settings): SettingConfig | undefined {
  return SETTINGS_CONFIG.find((setting) => setting.key === key);
}

export function isSettingEnabled(settings: Settings, config: SettingConfig): boolean {
  if (!config.dependencies) return true;

  return config.dependencies.every((dep) => settings[dep.setting] === dep.value);
}
