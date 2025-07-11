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
    id: "integrations",
    label: "Integrations",
    description: "Connect AB Suite with external services",
    order: 1,
  },
  {
    id: "display",
    label: "Display & Layout",
    description: "Customize how information is presented",
    order: 2,
  },
  {
    id: "features",
    label: "Features",
    description: "Enable or disable specific functionality",
    order: 3,
  },
  {
    id: "api",
    label: "API Configuration",
    description: "Configure external API credentials",
    order: 4,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Advanced settings and debugging options",
    order: 5,
  },
];

export const SETTINGS_CONFIG: SettingConfig[] = [
  // Integrations
  {
    key: "anilistIntegrationEnabled",
    label: "AniList Integration",
    description: "Adds AB buttons to AniList and AniList/MD links to AB",
    type: "boolean",
    category: "integrations",
    requiresReload: true,
  },
  {
    key: "seadexEnabled",
    label: "SeaDex Integration",
    description: "Tags recommended releases on torrent pages",
    type: "boolean",
    category: "integrations",
    requiresReload: true,
  },

  // Display & Layout
  {
    key: "tableRestructureEnabled",
    label: "Modern Table Layout",
    description: "Restructures torrent tables with organized columns for format info",
    type: "boolean",
    category: "display",
    requiresReload: true,
  },
  {
    key: "galleryViewEnabled",
    label: "Gallery View",
    description: "Adds a gallery view option to torrent search pages with cover images, tags, and descriptions",
    type: "boolean",
    category: "display",
    requiresReload: true,
  },
  {
    key: "compactResolutionMode",
    label: "Compact Resolution Display",
    description: "Shows resolution as width×height instead of separate aspect ratio and resolution columns",
    type: "boolean",
    category: "display",
    dependencies: [{ setting: "tableRestructureEnabled", value: true }],
  },
  {
    key: "showRegionColumn",
    label: "Show Region Column",
    description: "Displays the region column (R1, R2, A, B, etc.) in the modern table layout",
    type: "boolean",
    category: "display",
    dependencies: [{ setting: "tableRestructureEnabled", value: true }],
  },
  {
    key: "showDualAudioColumn",
    label: "Show Dual Audio Column",
    description: "Displays the dual audio column (checkmark/X indicator) in the modern table layout",
    type: "boolean",
    category: "display",
    dependencies: [{ setting: "tableRestructureEnabled", value: true }],
  },
  {
    key: "sectionsCollapsedByDefault",
    label: "Load Sections Collapsed",
    description: "When enabled, torrent table sections and groups will load collapsed by default",
    type: "boolean",
    category: "display",
  },
  {
    key: "treeFilelistEnabled",
    label: "Tree-Style Filelist",
    description: "Displays filelists in a tree structure with folders and files, similar to U2's filelist",
    type: "boolean",
    category: "display",
    requiresReload: true,
  },

  // Features
  {
    key: "RatingsEnabled",
    label: "Comprehensive Ratings",
    description: "Shows ratings from AniDB, AniList, Kitsu, MyAnimeList, TMDB, and IMDb with detailed score breakdowns",
    type: "boolean",
    category: "features",
    requiresReload: true,
  },
  {
    key: "TrailersEnabled",
    label: "Trailers",
    description: "Show trailers from YouTube when available",
    type: "boolean",
    category: "features",
    requiresReload: true,
  },
  {
    key: "mediainfoParserEnabled",
    label: "MediaInfo Parser",
    description: "Uses MediaInfo data to correct potentially mislabeled torrent information with actual file specs",
    type: "boolean",
    category: "features",
  },
  {
    key: "interactiveSearchEnabled",
    label: "Interactive Search Categories",
    description:
      "Highlights current categories and preserves search parameters when switching between Anime and Music sections",
    type: "boolean",
    category: "features",
  },
  {
    key: "autocompleteSearchEnabled",
    label: "Search Autocomplete",
    description: "Adds autocomplete functionality to search bars with keyboard navigation and caching",
    type: "boolean",
    category: "features",
  },
  {
    key: "readMoreEnabled",
    label: "Read More Links",
    description: "Adds 'Read all' links to truncated torrent descriptions that expand to show the full description",
    type: "boolean",
    category: "features",
  },
  {
    key: "enhancedTagStylingEnabled",
    label: "Enhanced Tag Styling",
    description:
      "Transforms tag display (e.g., 'school.life' → 'School Life') with color coding across the entire site",
    type: "boolean",
    category: "display",
    requiresReload: true,
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
