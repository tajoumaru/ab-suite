/**
 * Consolidated re-exports from domain-specific type files
 * This maintains backward compatibility while organizing types by domain
 */

// Re-export all details-related types
export type {
  FilelistItem,
  PeerlistItem,
  ScreenshotItem,
  SeaDexData,
  TorrentDetailsData,
  TorrentDetailsProps,
  UploadDescriptionData,
} from "./details";

// Re-export all table-related types
export type {
  GroupedTorrents,
  GroupHeader,
  SortColumn,
  SortDirection,
  TableItem,
  TableSection,
  TableType,
  TorrentTableProps,
  TorrentTableState,
} from "./tables";
// Re-export all torrent-related types
export type {
  MediaInfo,
  ParsedTorrentRow,
} from "./torrents";
