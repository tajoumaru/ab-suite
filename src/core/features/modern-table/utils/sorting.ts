import type { ParsedTorrentRow, SortColumn, SortDirection } from "../types";

/**
 * Sort torrents based on column and direction - comprehensive sorting logic from original
 */
export function sortTorrents(
  torrents: ParsedTorrentRow[],
  column: SortColumn,
  direction: SortDirection,
): ParsedTorrentRow[] {
  if (!column) return torrents;

  const sortFunctions: Record<NonNullable<SortColumn>, (a: ParsedTorrentRow, b: ParsedTorrentRow) => number> = {
    // Common columns (group is anime-only but kept for compatibility)
    group: (a, b) => compareStringsWithEmpties(a.group, b.group),
    size: (a, b) => parseSizeToBytes(a.size) - parseSizeToBytes(b.size),
    snatches: (a, b) => parseNumeric(a.snatches) - parseNumeric(b.snatches),
    seeders: (a, b) => parseNumeric(a.seeders) - parseNumeric(b.seeders),
    leechers: (a, b) => parseNumeric(a.leechers) - parseNumeric(b.leechers),
    flags: (a, b) => {
      const aScore = calculateFlagScore(a.flags);
      const bScore = calculateFlagScore(b.flags);

      // Primary sort by total flag score
      const scoreDiff = aScore - bScore;
      if (scoreDiff !== 0) return scoreDiff;

      // Secondary sort by flag count if scores are equal
      return a.flags.length - b.flags.length;
    },

    // Anime-specific columns
    format: (a, b) => compareStringsWithEmpties(a.format, b.format),
    region: (a, b) => compareStringsWithEmpties(a.region, b.region),
    container: (a, b) => compareStringsWithEmpties(a.container, b.container),
    videoCodec: (a, b) => compareStringsWithEmpties(a.videoCodec, b.videoCodec),
    resolution: (a, b) => {
      const resA = parseResolutionForSorting(a.resolution, a.aspectRatio);
      const resB = parseResolutionForSorting(b.resolution, b.aspectRatio);

      // Sort by height first, then width
      const heightDiff = resA.height - resB.height;
      if (heightDiff !== 0) return heightDiff;

      const widthDiff = resA.width - resB.width;
      if (widthDiff !== 0) return widthDiff;

      // Progressive comes after interlaced
      return (resA.isInterlaced ? 0 : 1) - (resB.isInterlaced ? 0 : 1);
    },
    audio: (a, b) => compareStringsWithEmpties(a.audio, b.audio),
    audioChannels: (a, b) => {
      const channelsA = parseChannelsForSorting(a.audioChannels);
      const channelsB = parseChannelsForSorting(b.audioChannels);
      return channelsA - channelsB;
    },
    hasDualAudio: (a, b) => Number(b.hasDualAudio) - Number(a.hasDualAudio), // Dual audio first
    subtitles: (a, b) => compareStringsWithEmpties(a.subtitles, b.subtitles),

    // Printed Media columns
    printedMediaType: (a, b) => compareStringsWithEmpties(a.printedMediaType || "", b.printedMediaType || ""),
    translator: (a, b) => compareStringsWithEmpties(a.translator || "", b.translator || ""),
    isDigital: (a, b) => Number(b.isDigital) - Number(a.isDigital), // Digital first
    printedFormat: (a, b) => compareStringsWithEmpties(a.printedFormat || "", b.printedFormat || ""),
    isOngoing: (a, b) => Number(b.isOngoing) - Number(a.isOngoing), // Ongoing first

    // Games columns
    gameType: (a, b) => compareStringsWithEmpties(a.gameType || "", b.gameType || ""),
    platform: (a, b) => compareStringsWithEmpties(a.platform || "", b.platform || ""),
    gameRegion: (a, b) => compareStringsWithEmpties(a.gameRegion || "", b.gameRegion || ""),
    isArchived: (a, b) => Number(b.isArchived) - Number(a.isArchived), // Archived first

    // Music columns
    musicCodec: (a, b) => compareStringsWithEmpties(a.musicCodec || "", b.musicCodec || ""),
    bitrate: (a, b) => compareStringsWithEmpties(a.bitrate || "", b.bitrate || ""),
    media: (a, b) => compareStringsWithEmpties(a.media || "", b.media || ""),
    hasLog: (a, b) => Number(b.hasLog) - Number(a.hasLog), // Log first
    hasCue: (a, b) => Number(b.hasCue) - Number(a.hasCue), // Cue first
  };

  const sortFn = sortFunctions[column];
  return torrents.sort((a, b) => {
    const result = sortFn(a, b);
    return direction === "desc" ? -result : result;
  });
}

// Helper functions for sorting

function compareStringsWithEmpties(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1; // Empty strings go to the end
  if (!b) return -1;
  return a.localeCompare(b);
}

function parseNumeric(value: string): number {
  const parsed = parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseSizeToBytes(sizeStr: string): number {
  if (!sizeStr) return 0;

  const match = sizeStr.match(/^([0-9,.]+)\s*([KMGT]?i?B)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1].replace(/,/g, ""));
  const unit = match[2].toUpperCase();

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    KIB: 1024,
    MIB: 1024 ** 2,
    GIB: 1024 ** 3,
    TIB: 1024 ** 4,
  };

  return value * (multipliers[unit] || 1);
}

function parseResolutionForSorting(
  resolutionStr: string,
  aspectRatio?: string,
): { width: number; height: number; isInterlaced: boolean } {
  const result = { width: 0, height: 0, isInterlaced: false };

  if (!resolutionStr) return result;

  // Handle direct width x height format
  const wxhMatch = resolutionStr.match(/^(\d+)x(\d+)([ip]?)$/);
  if (wxhMatch) {
    result.width = parseInt(wxhMatch[1], 10);
    result.height = parseInt(wxhMatch[2], 10);
    result.isInterlaced = wxhMatch[3] === "i";
    return result;
  }

  // Handle p/i format (720p, 1080p, etc.)
  const pMatch = resolutionStr.match(/^(\d+)([pi])$/);
  if (pMatch) {
    const height = parseInt(pMatch[1], 10);
    result.height = height;
    result.isInterlaced = pMatch[2] === "i";

    // Use aspect ratio if available, otherwise assume 16:9
    if (aspectRatio?.includes(":")) {
      const [w, h] = aspectRatio.split(":").map((n) => parseFloat(n));
      if (w && h) {
        result.width = Math.round((height * w) / h);
      } else {
        result.width = Math.round((height * 16) / 9); // fallback to 16:9
      }
    } else {
      result.width = Math.round((height * 16) / 9); // default to 16:9
    }

    return result;
  }

  // Handle special cases
  if (resolutionStr === "4K" || resolutionStr === "2160p") {
    result.width = 3840;
    result.height = 2160;
    result.isInterlaced = false;
  }

  return result;
}

function parseChannelsForSorting(channelsStr: string): number {
  if (!channelsStr) return 0;

  // Parse formats like "7.1", "5.1", "2.0", etc.
  const match = channelsStr.match(/^(\d+(?:\.\d+)?)(?:\s*ch)?$/i);
  if (match) {
    return parseFloat(match[1]);
  }

  return 0;
}

function calculateFlagScore(flags: string[]): number {
  let score = 0;

  for (const flag of flags) {
    const flagLower = flag.toLowerCase();

    // SeaDex Best (highest value)
    if (flagLower.includes("seadex") && flagLower.includes("best")) score += 8;
    // SeaDex Alt
    else if (flagLower.includes("seadex")) score += 4;
    // Freeleech
    else if (flagLower.includes("freeleech")) score += 2;
    // Remaster
    else if (flagLower.includes("remastered")) score += 1;
  }

  return score;
}
