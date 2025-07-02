// Shared types for the AnimeBytes Suite

export interface SeadexEntry {
  alID: string;
  notes: string;
  comparison: string[];
  isBest: boolean;
}

export interface SeadexResponse {
  items: {
    alID: string;
    notes: string;
    comparison: string;
    expand: {
      trs: {
        url: string;
        isBest: boolean;
      }[];
    };
  }[];
}

export interface FormatMap {
  anime: Record<string, string[]>;
  manga: Record<string, string[]>;
}

export interface TorrentInfo {
  torrentId: string;
  element: HTMLAnchorElement;
  separator: string;
}

// TableRestructure types
export interface ParsedTorrentRow {
  id: string;
  downloadLink: string;
  reportLink: string;
  detailsLink: string;
  format: string;
  container: string;
  region: string;
  videoCodec: string;
  aspectRatio: string;
  resolution: string;
  audio: string;
  audioChannels: string;
  hasDualAudio: boolean;
  subtitles: string;
  group: string;
  flags: string[];
  size: string;
  snatches: string;
  seeders: string;
  leechers: string;
  isFreeleech: boolean;
  isSeadexBest?: boolean;
  isSeadexAlt?: boolean;
  originalRow: HTMLTableRowElement;
  detailsContent?: HTMLElement | null;
  hasDetails: boolean;
}

export interface RequestOptions {
  method?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export type MediaType = "anime" | "manga" | "music";
export type Domain = "anilist.co" | "animebytes.tv" | "releases.moe";
