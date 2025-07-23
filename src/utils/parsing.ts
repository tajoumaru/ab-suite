import { log } from "@/lib/utils/logging";

/**
 * Shared parsing utilities for consistent data extraction across components
 */

export interface ParsingRule<T = unknown> {
  /** Pattern to match against input strings */
  pattern: RegExp | string | ((input: string) => boolean);
  /** Field name to set in the result object */
  field: string;
  /** Optional transformer function to modify the matched value */
  transformer?: (value: string, match?: RegExpMatchArray) => T;
  /** Stop processing further rules after this one matches */
  exclusive?: boolean;
}

export interface ParsingOptions {
  /** Case sensitive matching (default: false) */
  caseSensitive?: boolean;
  /** Skip empty or whitespace-only strings (default: true) */
  skipEmpty?: boolean;
  /** Log matches for debugging (default: false) */
  debug?: boolean;
}

/**
 * Creates a reusable parser function from a set of parsing rules
 * @param rules Array of parsing rules to apply
 * @param options Optional parsing configuration
 * @returns Parser function that processes string arrays
 */
export function createParser<T extends Record<string, unknown>>(
  rules: ParsingRule[],
  options: ParsingOptions = {},
): (input: string[]) => T {
  const { caseSensitive = false, skipEmpty = true, debug = false } = options;

  return function parse(input: string[]): T {
    const result = {} as T;

    for (const inputString of input) {
      const trimmed = inputString.trim();

      // Skip empty strings if configured
      if (skipEmpty && !trimmed) continue;

      const processString = caseSensitive ? trimmed : trimmed.toLowerCase();

      for (const rule of rules) {
        let matches = false;
        let matchResult: RegExpMatchArray | null = null;

        // Apply pattern matching
        if (typeof rule.pattern === "function") {
          matches = rule.pattern(trimmed);
        } else if (rule.pattern instanceof RegExp) {
          matchResult = (caseSensitive ? trimmed : processString).match(rule.pattern);
          matches = !!matchResult;
        } else {
          const patternString = caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
          matches = processString === patternString;
        }

        if (matches) {
          // Apply transformer or use original value
          const value = rule.transformer ? rule.transformer(trimmed, matchResult || undefined) : trimmed;

          (result as Record<string, unknown>)[rule.field] = value;

          if (debug) {
            log(`Parsing: "${trimmed}" -> ${rule.field} = ${value}`);
          }

          // Stop processing if exclusive rule
          if (rule.exclusive) break;
        }
      }
    }

    return result;
  };
}

/**
 * Creates a set-based validation parser for efficient lookup of valid values
 * @param validValues Set or array of valid values
 * @param field Field name to set when a valid value is found
 * @param transformer Optional value transformer
 */
export function createSetParser<T = string>(
  validValues: Set<string> | string[],
  field: string,
  transformer?: (value: string) => T,
): ParsingRule<T> {
  const valueSet = validValues instanceof Set ? validValues : new Set(validValues);

  return {
    pattern: (input: string) => valueSet.has(input),
    field,
    transformer,
    exclusive: false,
  };
}

/**
 * Creates a regex-based parser with optional capture groups
 * @param pattern Regular expression pattern
 * @param field Field name to set
 * @param transformer Optional transformer that receives match groups
 */
export function createRegexParser<T = string>(
  pattern: RegExp,
  field: string,
  transformer?: (value: string, match?: RegExpMatchArray) => T,
): ParsingRule<T> {
  return {
    pattern,
    field,
    transformer,
    exclusive: false,
  };
}

/**
 * Creates a boolean flag parser for simple present/absent values
 * @param trigger String or array of strings that set the flag to true
 * @param field Field name for the boolean flag
 */
export function createFlagParser(trigger: string | string[], field: string): ParsingRule<boolean> {
  const triggers = Array.isArray(trigger) ? new Set(trigger) : new Set([trigger]);

  return {
    pattern: (input: string) => triggers.has(input.toLowerCase()),
    field,
    transformer: () => true,
    exclusive: false,
  };
}

/**
 * Utility parsers for common patterns
 */
export const CommonParsers = {
  /**
   * Matches resolution patterns like "1920x1080", "720p", "1080i", "4K"
   */
  resolution: createRegexParser(/^(\d+x\d+|\d+[pi]|4K)$/i, "resolution", (_value, match) => {
    if (!match) return _value;
    if (match[1].match(/^\d+x\d+$/)) {
      return match[1];
    }
    return normalizeResolution(match[1]);
  }),

  /**
   * Matches aspect ratio patterns like "16:9", "4:3"
   */
  aspectRatio: createRegexParser(/^(\d+):(\d+)$/, "aspectRatio"),

  /**
   * Matches file sizes with units like "1.5 GB", "750 MB"
   */
  fileSize: createRegexParser(/^([\d.]+)\s*(GB|MB|KB|TB)$/i, "size", (value, match) => {
    if (!match) return { size: 0, unit: "B", raw: value };
    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return { size, unit, raw: value };
  }),

  /**
   * Matches parenthetical content like "(Group Name)" or "(Translator)"
   */
  parenthetical: createRegexParser(/^\(([^)]+)\)$/, "parenthetical", (_, match) => (match ? match[1] : "")),

  /**
   * Matches numeric values with optional suffixes
   */
  numeric: createRegexParser(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/, "numeric", (_, match) => {
    if (!match) return { value: 0, suffix: "", raw: "" };
    return {
      value: parseFloat(match[1]),
      suffix: match[2] || "",
      raw: match[0],
    };
  }),
};

/**
 * Helper function to normalize resolution strings
 */
function normalizeResolution(resolution: string): string {
  const normalized = resolution.toLowerCase();

  const resolutionMap: Record<string, string> = {
    "480p": "720x480",
    "480i": "720x480",
    "720p": "1280x720",
    "720i": "1280x720",
    "1080p": "1920x1080",
    "1080i": "1920x1080",
    "4k": "3840x2160",
    "2160p": "3840x2160",
  };

  return resolutionMap[normalized] || resolution;
}

/**
 * Pre-configured parsers for common anime/media formats
 */
export const MediaParsers = {
  /** Standard anime format parser */
  anime: createParser([
    CommonParsers.resolution,
    CommonParsers.aspectRatio,
    createSetParser(["MKV", "MP4", "AVI", "VOB", "VOB IFO", "TS", "M2TS", "FLV", "RMVB"], "format"),
    createSetParser(["h264", "h265", "AVC", "HEVC", "XviD", "DivX", "AV1"], "videoCodec"),
    createSetParser(["MP3", "AAC", "AC3", "DTS", "FLAC", "TrueHD"], "audioCodec"),
    createSetParser(["A", "B", "C", "R1", "R2", "R3", "R4", "R5", "R6"], "region"),
    createFlagParser(["dual audio", "dual-audio"], "hasDualAudio"),
    createFlagParser(["subtitled", "subbed"], "hasSubtitles"),
  ]),

  /** Music format parser */
  music: createParser([
    createSetParser(["AAC", "MP3", "FLAC"], "musicCodec"),
    createSetParser(["192", "V2 (VBR)", "256", "V0 (VBR)", "320", "Lossless"], "bitrate"),
    createSetParser(["CD", "DVD", "Blu-ray", "Vinyl", "Web"], "media"),
  ]),

  /** Games format parser */
  games: createParser([
    createSetParser(["PC", "PS2", "PSP", "Switch", "PS5"], "platform"),
    createSetParser(["NTSC-J", "NTSC-U", "PAL", "Region Free"], "region"),
    createFlagParser(["archived"], "isArchived"),
  ]),

  /** Printed media parser */
  printedMedia: createParser([
    createSetParser(["Raw", "Translated"], "printedMediaType"),
    createSetParser(["EPUB", "PDF", "Archived Scans"], "printedFormat"),
    createFlagParser(["digital"], "isDigital"),
    createFlagParser(["ongoing"], "isOngoing"),
    CommonParsers.parenthetical, // For translator/publisher
  ]),
};

/**
 * String cleaning utilities
 */
export const StringUtils = {
  /**
   * Removes common prefixes and cleans format strings
   */
  cleanFormatString(input: string): string {
    return input
      .replace(/^»\s*/, "") // Remove arrow character
      .replace(/^\s*[-|]\s*/, "") // Remove leading separators
      .trim();
  },

  /**
   * Splits format strings intelligently, respecting parentheses
   */
  smartSplit(input: string, separator = "|"): string[] {
    const parts: string[] = [];
    let current = "";
    let depth = 0;

    for (const char of input) {
      if (char === "(") {
        depth++;
        current += char;
      } else if (char === ")") {
        depth--;
        current += char;
      } else if (char === separator && depth === 0) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  },

  /**
   * Normalizes whitespace and removes extra characters
   */
  normalizeWhitespace(input: string): string {
    return input
      .replace(/\s+/g, " ") // Multiple spaces to single space
      .replace(/\u00A0/g, " ") // Non-breaking spaces to regular spaces
      .trim();
  },
};
