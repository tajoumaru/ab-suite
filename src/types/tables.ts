/**
 * Table UI and state management types
 */

import type { ParsedTorrentRow } from "./torrents";

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
  torrents: ParsedTorrentRow[];
  originalTable?: HTMLTableElement; // Add reference to original table for grouped extraction
  isSeriesPage?: boolean; // Add flag to indicate series page behavior
}
