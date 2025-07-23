/**
 * Format-specific parsers using the standardized parsing utilities
 * These demonstrate how to consolidate repeated parsing logic
 */

import { MEDIA_FORMATS, RESOLUTIONS } from "@/constants";
import { createFlagParser, createParser, createRegexParser, createSetParser } from "@/utils/parsing";

/**
 * Improved anime format parser using standardized utilities
 */
export const animeFormatParser = createParser(
  [
    // Resolution patterns with normalization
    createRegexParser(/^(\d+x\d+|\d+[pi]|4K)$/i, "resolution", (_value, match) => {
      if (!match) return _value;
      const input = match[1].toLowerCase();
      // Use constants for resolution mapping
      return RESOLUTIONS.STANDARD_RESOLUTIONS[input as keyof typeof RESOLUTIONS.STANDARD_RESOLUTIONS] || match[1];
    }),

    // Aspect ratio detection
    createRegexParser(/^(\d+):(\d+)$/, "aspectRatio"),

    // Video formats from constants
    createSetParser(["TV", "DVD", "Blu-ray", "UHD Blu-ray", "HD DVD", "Web"], "format"),

    // Container formats
    createSetParser([...MEDIA_FORMATS.VIDEO_FORMATS], "container"),

    // Video codecs
    createSetParser([...MEDIA_FORMATS.VIDEO_CODECS], "videoCodec"),

    // Audio codecs
    createSetParser([...MEDIA_FORMATS.AUDIO_CODECS], "audioCodec"),

    // Regions
    createSetParser([...MEDIA_FORMATS.REGIONS], "region"),

    // Boolean flags
    createFlagParser(["dual audio", "dual-audio"], "hasDualAudio"),
    createFlagParser(["subtitled", "subbed", "softsubs"], "hasSubtitles"),
    createFlagParser(["censored"], "isCensored"),
    createFlagParser(["uncensored"], "isUncensored"),
  ],
  { caseSensitive: false, debug: false },
);

/**
 * Music format parser
 */
export const musicFormatParser = createParser([
  createSetParser([...MEDIA_FORMATS.MUSIC_CODECS], "musicCodec"),
  createSetParser([...MEDIA_FORMATS.MUSIC_BITRATES], "bitrate"),
  createSetParser([...MEDIA_FORMATS.MUSIC_MEDIA], "media"),
  createFlagParser(["scene"], "isScene"),
  createRegexParser(/^(\d{4})$/, "year", (_, match) => (match ? parseInt(match[1]) : 0)),
]);

/**
 * Games format parser
 */
export const gamesFormatParser = createParser([
  createSetParser([...MEDIA_FORMATS.GAME_PLATFORMS], "platform"),
  createSetParser(["Game", "Patch", "DLC", "Update"], "gameType"),
  createSetParser([...MEDIA_FORMATS.REGIONS], "region"),
  createFlagParser(["archived"], "isArchived"),
  createFlagParser(["cracked", "scene"], "isCracked"),
]);

/**
 * Printed media format parser
 */
export const printedMediaFormatParser = createParser([
  createSetParser(["Raw", "Translated"], "printedMediaType"),
  createSetParser([...MEDIA_FORMATS.PRINTED_FORMATS], "printedFormat"),
  createFlagParser(["digital"], "isDigital"),
  createFlagParser(["ongoing"], "isOngoing"),

  // Parenthetical content for translator/publisher
  createRegexParser(/^\(([^)]+)\)$/, "translator", (_, match) => (match ? match[1] : "")),
]);

/**
 * Universal file size parser
 */
export const fileSizeParser = createRegexParser(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i, "fileSize", (value, match) => {
  if (!match) return { size: 0, unit: "B", bytes: 0, raw: value };
  return {
    size: parseFloat(match[1]),
    unit: match[2].toUpperCase(),
    bytes: parseFloat(match[1]) * getUnitMultiplier(match[2].toUpperCase()),
    raw: value,
  };
});

/**
 * Helper function to get byte multiplier for units
 */
function getUnitMultiplier(unit: string): number {
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  return multipliers[unit] || 1;
}

/**
 * Example usage function showing how to use the parsers
 */
export function parseAnimeFormat(formatString: string) {
  // Split the format string intelligently
  const parts = formatString
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !part.includes("<img"));

  // Parse using the standardized parser
  const result = animeFormatParser(parts);

  return {
    // Merged result with defaults
    resolution: "",
    aspectRatio: "",
    format: "",
    container: "",
    videoCodec: "",
    audioCodec: "",
    region: "",
    hasDualAudio: false,
    hasSubtitles: false,
    isCensored: false,
    isUncensored: false,
    ...result,
  };
}

/**
 * Batch parsing function for multiple format strings
 */
export function batchParseFormats(
  formatStrings: string[],
  parserType: "anime" | "music" | "games" | "printedMedia" = "anime",
) {
  const parser = {
    anime: animeFormatParser,
    music: musicFormatParser,
    games: gamesFormatParser,
    printedMedia: printedMediaFormatParser,
  }[parserType];

  return formatStrings.map((formatString) => {
    const parts = formatString
      .split(/[|/]/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parser(parts);
  });
}

/**
 * Validation helper to check if parsing extracted expected fields
 */
export function validateParsedFormat(
  parsed: Record<string, unknown>,
  requiredFields: string[],
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter((field) => !parsed[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
