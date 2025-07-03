/**
 * Clean data structures for torrent information extracted from the DOM
 */

export interface ParsedTorrentRow {
  // Core identifiers
  torrentId: string;
  groupId: string;

  // Basic info
  name: string;
  group: string;
  year: string;

  // Format details
  format: string;
  container: string;
  videoCodec: string;
  resolution: string;
  aspectRatio: string;

  // Audio info
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
  | "group"
  | "format"
  | "region"
  | "container"
  | "videoCodec"
  | "resolution"
  | "audio"
  | "audioChannels"
  | "hasDualAudio"
  | "subtitles"
  | "size"
  | "snatches"
  | "seeders"
  | "leechers"
  | "flags"
  | null;

export type SortDirection = "asc" | "desc";

export interface TorrentTableState {
  expandedRows: Set<string>;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}
