/**
 * Clean data structures for torrent information extracted from the DOM
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
 * Represents either a torrent, section header, or group header in the table
 */
export type TableItem = ParsedTorrentRow | TableSection | GroupHeader;

export interface ParsedTorrentRow {
  type?: "torrent"; // Optional type discriminator
  // Core identifiers
  torrentId: string;
  groupId: string;

  // Basic info
  name: string;
  group: string;
  year: string;

  // Format details (primarily for anime)
  format: string;
  container: string;
  videoCodec: string;
  resolution: string;
  aspectRatio: string;

  // Audio info (primarily for anime)
  audio: string;
  audioChannels: string;
  hasDualAudio: boolean;

  // Regional info
  region: string;
  origin: string;
  subtitles: string;

  // File info
  size: string;
  fileCount: string;

  // Statistics
  snatches: string;
  seeders: string;
  leechers: string;

  // Quality indicators
  flags: string[];

  // Links and actions
  downloadLink: string;
  torrentLink: string;
  detailsLink: string;

  // Raw HTML for details (used in TorrentDetails component)
  detailsHtml: string;

  // Additional metadata
  uploader: string;
  uploadTime: string;

  // Section information
  sectionId?: string; // ID of the section this torrent belongs to
  sectionTitle?: string; // Title of the section this torrent belongs to

  // Printed Media specific fields
  printedMediaType?: "Raw" | "Translated"; // Type for printed media
  translator?: string; // Translator/publisher for printed media
  isDigital?: boolean; // Digital format indicator
  printedFormat?: "Archived Scans" | "EPUB" | "PDF"; // Format for printed media
  isOngoing?: boolean; // Ongoing series indicator

  // Games specific fields
  gameType?: "Game" | "Patch" | "DLC"; // Type for games
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
    | "Switch"; // Platform for games
  gameRegion?: "Region Free" | "NTSC-J" | "NTSC-U" | "PAL" | "JPN" | "ENG" | "EUR"; // Region for games
  isArchived?: boolean; // Archived status for games

  // Music specific fields
  musicCodec?: "AAC" | "MP3" | "FLAC"; // Codec for music
  bitrate?: "192" | "V2 (VBR)" | "256" | "V0 (VBR)" | "320" | "Lossless" | "Lossless 24-bit"; // Bitrate for music
  media?: "CD" | "DVD" | "Blu-ray" | "Cassette" | "Vinyl" | "Soundboard" | "Web"; // Media type for music
  hasLog?: boolean; // Log file indicator (CD only)
  hasCue?: boolean; // Cue file indicator (CD only)

  // Media info (if available)
  mediaInfo?: {
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
  };

  // SeaDex integration data (populated later)
  seadex?: {
    alID: string;
    notes: string;
    isBest: boolean;
    comparison: string[];
  };

  // Legacy compatibility fields from original implementation
  id?: string; // Alias for torrentId for backward compatibility
  reportLink?: string; // Report link if different from constructed one
  isFreeleech?: boolean; // Freeleech indicator
  isSeaDexBest?: boolean; // SeaDex Best indicator
  isSeaDexAlt?: boolean; // SeaDex Alt indicator
  hasDetails?: boolean; // Has details row indicator
  originalRow?: HTMLElement; // Reference to original DOM row
  detailsContent?: HTMLElement; // Reference to original details content
}

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

export type SortDirection = "asc" | "desc";

export interface TorrentTableState {
  expandedRows: Set<string>;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  tableType: TableType;
}

/**
 * Grouped torrents data structure that preserves section order
 */
export interface GroupedTorrents {
  sections: Array<{
    section: TableSection | GroupHeader | null; // null for torrents without a section
    torrents: ParsedTorrentRow[];
  }>;
}

export interface TorrentTableProps {
  torrents: ParsedTorrentRow[];
  originalTable?: HTMLTableElement; // Add reference to original table for grouped extraction
  isSeriesPage?: boolean; // Add flag to indicate series page behavior
}

// Torrent details data structures
export interface SeaDexData {
  html?: string;
  // Add other SeaDex properties as needed
}

export interface TorrentDetailsData {
  uploadDescription: UploadDescriptionData;
  description: string;
  mediaInfo: string;
  filelist: FilelistItem[];
  screenshots: ScreenshotItem[];
  peerlist: PeerlistItem[];
  seadexData: SeaDexData | null;
}

export interface UploadDescriptionData {
  uploader: {
    name: string;
    profileUrl?: string; // undefined for anonymous uploads
    isAnonymous: boolean;
  };
  uploadDate: {
    absolute: string; // e.g., "Oct 08 2018, 22:03 UTC"
    relative: string; // e.g., "6 years, 8 months ago"
  };
  ratioInfo: {
    type: "freeleech" | "ratio_impact";
    ratioValue?: string; // Only present for ratio_impact type
  };
}

export interface FilelistItem {
  filename: string;
  size: string;
}

export interface ScreenshotItem {
  id: string;
  groupId: string;
  thumbnailUrl: string;
  fullUrl: string;
  title: string;
}

export interface PeerlistItem {
  username: string;
  profileUrl?: string;
  downloaded: string;
  uploaded: string;
  percentage: string;
  isAnonymous: boolean;
  badges: string[]; // HTML for badges like donor icons
}

export interface TorrentDetailsProps {
  torrentId: string;
  groupId: string;
  detailsHtml: string;
  onDataExtracted?: (data: TorrentDetailsData) => void;
}
