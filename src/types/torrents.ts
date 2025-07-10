/**
 * Core torrent data structures and media-specific types
 */

/**
 * Media information extracted from MediaInfo tool
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
 * Core torrent data extracted from DOM
 */
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
  printedMediaType?: "Raw" | "Translated";
  translator?: string;
  isDigital?: boolean;
  printedFormat?: "Archived Scans" | "EPUB" | "PDF";
  isOngoing?: boolean;

  // Games specific fields
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

  // Music specific fields
  musicCodec?: "AAC" | "MP3" | "FLAC";
  bitrate?: "192" | "V2 (VBR)" | "256" | "V0 (VBR)" | "320" | "Lossless" | "Lossless 24-bit";
  media?: "CD" | "DVD" | "Blu-ray" | "Cassette" | "Vinyl" | "Soundboard" | "Web";
  hasLog?: boolean; // Log file indicator (CD only)
  hasCue?: boolean; // Cue file indicator (CD only)

  // Media info (if available)
  mediaInfo?: MediaInfo;

  // SeaDx integration data (populated later)
  seadx?: {
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
