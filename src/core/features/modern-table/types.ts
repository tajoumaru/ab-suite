/**
 * Types specific to the modern-table feature
 * Co-located with the feature for better maintainability
 */

/**
 * Table types supported by the modern table
 */
export type TableType = "anime" | "printed_media" | "games" | "music";

/**
 * Represents a table section header (e.g., "Episode 48")
 */
export interface TableSection {
  type: "section";
  id: string; // Unique identifier for this section
  title: string; // The section title (e.g., "Episode 48")
  originalRow?: HTMLElement; // Reference to original DOM row
}

/**
 * Represents a group header (e.g., "2025 - TV Series")
 */
export interface GroupHeader {
  type: "group";
  id: string; // Unique identifier for this group
  title: string; // The group title (e.g., "2025 - TV Series")
  originalRow?: HTMLElement; // Reference to original DOM row
  fullHtml?: string; // Full HTML content of the group row
}

/**
 * Available sorting columns across all table types
 */
export type SortColumn =
  // Common columns
  | "group"
  | "size"
  | "snatches"
  | "seeders"
  | "leechers"
  | "flags"
  // Anime-specific columns
  | "format"
  | "region"
  | "container"
  | "videoCodec"
  | "resolution"
  | "audio"
  | "audioChannels"
  | "hasDualAudio"
  | "subtitles"
  // Printed Media columns
  | "printedMediaType"
  | "translator"
  | "isDigital"
  | "printedFormat"
  | "isOngoing"
  // Games columns
  | "gameType"
  | "platform"
  | "gameRegion"
  | "isArchived"
  // Music columns
  | "musicCodec"
  | "bitrate"
  | "media"
  | "hasLog"
  | "hasCue"
  | null;

/**
 * Sorting direction
 */
export type SortDirection = "asc" | "desc";

/**
 * UI state for the torrent table
 */
export interface TorrentTableState {
  expandedRows: Set<string>;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  tableType: TableType;
}

/**
 * Media info structure for torrent details
 */
export interface MediaInfo {
  video?: {
    codec: string;
    bitrate: string;
    width: number;
    height: number;
    framerate: string;
  };
  audio?: Array<{
    codec: string;
    bitrate: string;
    channels: string;
    language: string;
  }>;
  subtitles?: Array<{
    language: string;
    type: string;
  }>;
}

/**
 * Parsed torrent row data structure
 */
export interface ParsedTorrentRow {
  // Core identification
  type: "torrent";
  torrentId: string;
  groupId: string;
  name: string;

  // Common fields across all table types
  group: string;
  year: string;
  size: string;
  fileCount: string;
  snatches: string;
  seeders: string;
  leechers: string;
  flags: string[];
  uploader: string;
  uploadTime: string;

  // Links
  downloadLink: string;
  torrentLink: string;
  detailsLink: string;
  reportLink: string;

  // Anime-specific fields
  format: string;
  container: string;
  videoCodec: string;
  resolution: string;
  aspectRatio: string;
  audio: string;
  audioChannels: string;
  hasDualAudio: boolean;
  region: string;
  origin: string;
  subtitles: string;

  // Printed Media fields
  printedMediaType?: "Raw" | "Translated";
  translator?: string;
  printedFormat?: "EPUB" | "PDF" | "Archived Scans";
  isDigital?: boolean;
  isOngoing?: boolean;

  // Games fields
  gameType?: "Game" | "Patch" | "DLC";
  platform?:
    | "PC"
    | "PS2"
    | "PSP"
    | "PSX"
    | "GameCube"
    | "Wii"
    | "GBA"
    | "NDS"
    | "N64"
    | "SNES"
    | "NES"
    | "Dreamcast"
    | "PS3"
    | "3DS"
    | "PS Vita"
    | "Switch";
  gameRegion?: "Region Free" | "NTSC-J" | "NTSC-U" | "PAL" | "JPN" | "ENG" | "EUR";
  isArchived?: boolean;

  // Music fields
  musicCodec?: "AAC" | "MP3" | "FLAC";
  bitrate?: "192" | "V2 (VBR)" | "256" | "V0 (VBR)" | "320" | "Lossless" | "Lossless 24-bit";
  media?: "CD" | "DVD" | "Blu-ray" | "Cassette" | "Vinyl" | "Soundboard" | "Web";
  hasLog?: boolean;
  hasCue?: boolean;

  // Status flags
  isFreeleech: boolean;
  isSeaDexBest: boolean;
  isSeaDexAlt: boolean;

  // Section information
  sectionId?: string;
  sectionTitle?: string;

  // Details and enhanced data
  hasDetails: boolean;
  detailsHtml: string;
  mediaInfo?: MediaInfo;

  // Legacy compatibility
  id: string; // Alias for torrentId
  originalRow?: HTMLElement;
  detailsContent?: HTMLElement;

  // SeaDex integration
  seadex?: {
    alID: string;
    notes: string;
    isBest: boolean;
    comparison: string[];
  };
}

/**
 * Represents either a torrent, section header, or group header in the table
 */
export type TableItem = ParsedTorrentRow | TableSection | GroupHeader;

/**
 * Grouped torrents data structure that preserves section order
 */
export interface GroupedTorrents {
  sections: Array<{
    section: TableSection | GroupHeader | null; // null for torrents without a section
    torrents: ParsedTorrentRow[];
  }>;
}

/**
 * Props for the main TorrentTable component
 */
export interface TorrentTableProps {
  groupedData: GroupedTorrents;
  tableType?: TableType;
  isSeriesPage?: boolean; // Add flag to indicate series page behavior
}

// Re-export types that are used by other features
export type {
  FilelistItem,
  PeerlistItem,
  ScreenshotItem,
  SeaDexData,
  TorrentDetailsData,
  TorrentDetailsProps,
  UploadDescriptionData,
} from "./detail-components/types";
