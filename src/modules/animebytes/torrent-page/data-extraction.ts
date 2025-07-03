import { parseMediaInfo } from "mi-parser";
import type { ParsedTorrentRow } from "./types";

/**
 * Extracts torrent data from the original HTML table, converting it to clean JavaScript objects.
 * This is the "data extraction" phase of the declarative takeover approach.
 */
export function extractTorrentData(
  table: HTMLTableElement,
  mediainfoParserEnabled: boolean = true,
): ParsedTorrentRow[] {
  const torrentRows = Array.from(table.querySelectorAll("tr.group_torrent")) as HTMLTableRowElement[];

  return torrentRows
    .map((row) => parseTorrentRow(row, mediainfoParserEnabled))
    .filter((torrent): torrent is ParsedTorrentRow => torrent !== null);
}

/**
 * Parses a single torrent row from the DOM into a clean data structure
 */
function parseTorrentRow(row: HTMLTableRowElement, mediainfoParserEnabled: boolean = true): ParsedTorrentRow | null {
  try {
    // Get the main torrent cell (first td)
    const mainCell = row.querySelector("td:first-child");
    if (!mainCell) return null;

    // Extract download and details links
    const downloadLink = mainCell.querySelector('a[href*="/torrent/"]')?.getAttribute("href") || "";
    const detailsLink = mainCell.querySelector('a[href*="torrents.php"]') as HTMLAnchorElement;
    if (!detailsLink) return null;

    // Extract torrent and group IDs
    const torrentIdMatch = detailsLink.href.match(/torrentid=(\d+)/);
    const groupIdMatch = detailsLink.href.match(/id=(\d+)/);
    const torrentId = torrentIdMatch ? torrentIdMatch[1] : "";
    const groupId = groupIdMatch ? groupIdMatch[1] : "";

    // Get the text content and parse format information
    const linkText = detailsLink.textContent?.trim() || "";
    const formatText = linkText.replace(/^»\s*/, ""); // Remove arrow character

    // Check for details row (next sibling with class "pad" and id "torrent_{torrentId}")
    const nextRow = row.nextElementSibling as HTMLElement;
    const detailsRow = nextRow?.classList.contains("pad") && nextRow.id === `torrent_${torrentId}` ? nextRow : null;

    // Initialize parsed data with required fields
    const parsed: ParsedTorrentRow = {
      torrentId,
      groupId,
      name: linkText,
      group: "",
      year: "",
      format: "",
      container: "",
      videoCodec: "",
      resolution: "",
      aspectRatio: "",
      audio: "",
      audioChannels: "",
      hasDualAudio: false,
      region: "",
      origin: "",
      subtitles: "",
      size: "",
      fileCount: "",
      snatches: "",
      seeders: "",
      leechers: "",
      flags: [],
      downloadLink,
      torrentLink: downloadLink,
      detailsLink: detailsLink.href,
      detailsHtml: detailsRow?.innerHTML || "",
      uploader: "",
      uploadTime: "",

      // Legacy compatibility fields
      id: torrentId, // Alias for backward compatibility
      reportLink: `/reports.php?action=report&type=torrent&id=${torrentId}`,
      isFreeleech: false,
      isSeaDexBest: false,
      isSeaDexAlt: false,
      hasDetails: !!detailsRow,
      originalRow: row,
      detailsContent: detailsRow || undefined,
    };

    // Parse format information using smart split
    const parts = smartSplit(formatText);
    parseTorrentParts(parts, parsed);

    // Get statistics from other columns
    const cells = row.querySelectorAll("td");
    parsed.size = cells[1]?.textContent?.trim() || "";
    parsed.snatches = cells[2]?.textContent?.trim() || "";
    parsed.seeders = cells[3]?.textContent?.trim() || "";
    parsed.leechers = cells[4]?.textContent?.trim() || "";

    // Extract flags and special indicators
    extractFlags(mainCell, parsed);

    // Check for freeleech indicator
    parsed.isFreeleech = mainCell.innerHTML.includes("freeleech") || row.classList.contains("freeleech");

    // Check for SeaDex indicators
    // First check if SeaDex integration has already processed this row
    if (row.classList.contains("seadex-best")) {
      parsed.isSeaDexBest = true;
      console.log("AB Suite: Found SeaDex Best via row class for torrent", torrentId);
    } else if (row.classList.contains("seadex-alt")) {
      parsed.isSeaDexAlt = true;
      console.log("AB Suite: Found SeaDex Alt via row class for torrent", torrentId);
    }

    // Look for specific SeaDex elements (icons/buttons added by SeaDex integration)
    const seadexIcon = mainCell.querySelector(".ab-seadex-icon, .seadex-icon");
    if (seadexIcon) {
      // Determine if it's best or alt based on the icon's attributes
      const iconContent = seadexIcon.innerHTML.toLowerCase();
      const iconClasses = seadexIcon.className.toLowerCase();
      const iconTitle = seadexIcon.getAttribute("title")?.toLowerCase() || "";

      if (iconContent.includes("best") || iconClasses.includes("best") || iconTitle.includes("best")) {
        parsed.isSeaDexBest = true;
        console.log("AB Suite: Found SeaDex Best via icon for torrent", torrentId);
      } else {
        parsed.isSeaDexAlt = true;
        console.log("AB Suite: Found SeaDex Alt via icon for torrent", torrentId);
      }
    }

    // Add debugging for SeaDex status
    if (parsed.isSeaDexBest || parsed.isSeaDexAlt) {
      console.log("AB Suite: SeaDex status for torrent", torrentId, ":", {
        isSeaDexBest: parsed.isSeaDexBest,
        isSeaDexAlt: parsed.isSeaDexAlt,
        flagsCount: parsed.flags.length,
      });
    }

    // Parse media info if available and enabled
    if (detailsRow && mediainfoParserEnabled) {
      parseMediaInfoFromDetails(detailsRow, torrentId, parsed);
    }

    return parsed;
  } catch (error) {
    console.error("AB Suite: Failed to parse torrent row", error);
    return null;
  }
}

/**
 * Smart split function that respects parentheses when splitting by |
 */
function smartSplit(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === "(") {
      parenDepth++;
      current += char;
    } else if (char === ")") {
      parenDepth--;
      current += char;
    } else if (char === "|" && parenDepth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Parse torrent format parts and categorize them
 */
function parseTorrentParts(parts: string[], parsed: ParsedTorrentRow): void {
  // Define valid values from site dropdowns
  const validFormats = new Set(["TV", "DVD", "Blu-ray", "UHD Blu-ray", "HD DVD", "VHS", "VCD", "LD", "Web"]);
  const validContainers = new Set([
    "AVI",
    "MKV",
    "MP4",
    "OGM",
    "WMV",
    "MPG",
    "ISO",
    "VOB",
    "VOB IFO",
    "TS",
    "M2TS",
    "FLV",
    "RMVB",
  ]);
  const validCodecs = new Set([
    "h264",
    "h264 10-bit",
    "h265",
    "h265 10-bit",
    "h265 12-bit",
    "AVC",
    "AVC-10b",
    "HEVC",
    "HEVC-10b",
    "HEVC-12b",
    "XviD",
    "DivX",
    "WMV",
    "MPEG-1/2",
    "VC-1",
    "MPEG-TS",
    "DVD5",
    "DVD9",
    "RealVideo",
    "VP6",
    "VP9",
    "AV1",
  ]);
  const validAudioCodecs = new Set([
    "MP3",
    "Vorbis",
    "Opus",
    "AAC",
    "AC3",
    "TrueHD",
    "DTS",
    "DTS-ES",
    "FLAC",
    "PCM",
    "WMA",
    "MP2",
    "WAV",
    "DTS-HD",
    "DTS-HD MA",
    "RealAudio",
  ]);
  const validRegions = new Set(["A", "B", "C", "R1", "R3", "R4", "R5", "R6", "R2 Japan", "R2 Europe"]);

  for (const part of parts) {
    const cleanPart = part.trim();
    if (!cleanPart || cleanPart.includes("<img")) continue;

    // Check for resolution
    if (cleanPart.match(/^\d+x\d+$/) || cleanPart.match(/^\d+(p|i)$/) || cleanPart === "4K") {
      if (cleanPart.match(/^\d+x\d+$/)) {
        parsed.resolution = cleanPart;
        if (!parsed.aspectRatio) {
          parsed.aspectRatio = calculateAspectRatio(cleanPart);
        }
      } else {
        parsed.resolution = normalizeResolution(cleanPart);
      }
    }
    // Check for aspect ratio
    else if (cleanPart.match(/^\d+:\d+$/)) {
      parsed.aspectRatio = cleanPart;
    }
    // Handle DVD5/DVD9 special case
    else if (cleanPart === "DVD5" || cleanPart === "DVD9") {
      parsed.format = "DVD";
      parsed.videoCodec = cleanPart;
    }
    // Check for video codecs
    else if (validCodecs.has(cleanPart) && cleanPart !== "DVD5" && cleanPart !== "DVD9") {
      parsed.videoCodec = cleanPart;
    }
    // Check for audio
    else if (Array.from(validAudioCodecs).some((codec) => cleanPart.toLowerCase().includes(codec.toLowerCase()))) {
      const audioInfo = parseAudio(cleanPart);
      parsed.audio = audioInfo.codec;
      parsed.audioChannels = audioInfo.channels;
    }
    // Check for dual audio
    else if (cleanPart.match(/dual\s+audio/i)) {
      parsed.hasDualAudio = true;
    }
    // Check for subtitles
    else if (cleanPart.match(/(subtitle|softsub|hardsub|raw)/i)) {
      const { clean, group } = extractGroup(cleanPart);
      parsed.subtitles = clean;
      if (group && !parsed.group) {
        parsed.group = group;
      }
    }
    // Check for container formats
    else if (validContainers.has(cleanPart)) {
      parsed.container = cleanPart;
    }
    // Check for container with region
    else if (cleanPart.match(/^([A-Z0-9\s]+)\s*\(([^)]+)\)$/i)) {
      const match = cleanPart.match(/^([A-Z0-9\s]+)\s*\(([^)]+)\)$/i);
      if (match) {
        const baseContainer = match[1].trim();
        const regionPart = match[2].trim();
        if (validContainers.has(baseContainer)) {
          parsed.container = baseContainer;
          if (validRegions.has(regionPart)) {
            parsed.region = regionPart;
          }
        }
      }
    }
    // Check for formats
    else if (validFormats.has(cleanPart)) {
      parsed.format = cleanPart;
    }
    // Fallback format assignment
    else if (!parsed.format) {
      const matchingFormat = Array.from(validFormats).find((f) => f.toLowerCase() === cleanPart.toLowerCase());
      parsed.format = matchingFormat || cleanPart;
    }
  }

  // Normalize codec names
  if (parsed.videoCodec) {
    const codecNormalizationMap: Record<string, string> = {
      h264: "AVC",
      "h264 10-bit": "AVC-10b",
      h265: "HEVC",
      "h265 10-bit": "HEVC-10b",
      "h265 12-bit": "HEVC-12b",
    };
    parsed.videoCodec = codecNormalizationMap[parsed.videoCodec] || parsed.videoCodec;
  }
}

/**
 * Extract group name from parenthetical info
 */
function extractGroup(text: string): { clean: string; group: string } {
  const lastParenIndex = text.lastIndexOf("(");
  const lastCloseParen = text.lastIndexOf(")");

  if (lastParenIndex !== -1 && lastCloseParen !== -1 && lastCloseParen > lastParenIndex) {
    const clean = text.substring(0, lastParenIndex).trim();
    const group = text.substring(lastParenIndex + 1, lastCloseParen).trim();
    return { clean, group };
  }
  return { clean: text, group: "" };
}

/**
 * Parse audio codec and channels from audio string
 */
function parseAudio(audioStr: string): { codec: string; channels: string } {
  const channelMatch = audioStr.match(/([\d.]+\s*ch|\d\.\d)/i);
  const channels = channelMatch ? channelMatch[0] : "";
  const codecPart = audioStr.replace(/([\d.]+\s*ch|\d\.\d)/i, "").trim();

  const validAudioCodecs = new Set([
    "MP3",
    "Vorbis",
    "Opus",
    "AAC",
    "AC3",
    "TrueHD",
    "DTS",
    "DTS-ES",
    "FLAC",
    "PCM",
    "WMA",
    "MP2",
    "WAV",
    "DTS-HD",
    "DTS-HD MA",
    "RealAudio",
  ]);

  let codec = "";
  for (const validCodec of validAudioCodecs) {
    if (codecPart.toLowerCase().includes(validCodec.toLowerCase())) {
      codec = validCodec;
      break;
    }
  }

  return { codec: codec || codecPart, channels };
}

/**
 * Calculate aspect ratio from pixel resolution
 */
function calculateAspectRatio(res: string): string {
  const match = res.match(/^(\d+)x(\d+)$/);
  if (!match) return "";

  const width = parseInt(match[1]);
  const height = parseInt(match[2]);
  const ratio = width / height;

  // Common aspect ratios
  if (Math.abs(ratio - 16 / 9) < 0.01) return "16:9";
  if (Math.abs(ratio - 4 / 3) < 0.01) return "4:3";
  if (Math.abs(ratio - 3 / 2) < 0.01) return "3:2";
  if (Math.abs(ratio - 5 / 4) < 0.01) return "5:4";
  if (Math.abs(ratio - 1.85) < 0.01) return "1.85:1";
  if (Math.abs(ratio - 2.35) < 0.01) return "2.35:1";

  return `${ratio.toFixed(2)}:1`;
}

/**
 * Normalize resolution to standard format
 */
function normalizeResolution(res: string): string {
  const resolutionMap: Record<string, string> = {
    "4K": "2160p",
    "720x480": "480p",
    "720x400": "400p",
    "848x480": "480p",
    "856x480": "480p",
    "704x396": "396p",
    "960x540": "540p",
  };

  if (res.match(/^\d+(p|i)$/)) return res;
  return resolutionMap[res] || res;
}

/**
 * Extract flags and special indicators from torrent cell
 */
function extractFlags(mainCell: Element, parsed: ParsedTorrentRow): void {
  // Extract all images as flags
  const images = mainCell.querySelectorAll("img");
  images.forEach((img) => {
    parsed.flags.push(img.outerHTML);
  });

  // Extract other flag elements (buttons, spans, etc.)
  const flagElements = mainCell.querySelectorAll(".flag, [class*='flag']");
  flagElements.forEach((element) => {
    parsed.flags.push(element.outerHTML);
  });
}

/**
 * Parse MediaInfo from details row if available
 */
function parseMediaInfoFromDetails(detailsRow: HTMLElement, torrentId: string, parsed: ParsedTorrentRow): void {
  try {
    const escapedId = CSS.escape(`${torrentId}_mediainfo`);
    const mediainfoElement = detailsRow.querySelector(`#${escapedId} .spoiler .codeBox pre`);

    if (!mediainfoElement) return;

    const mediainfoText = mediainfoElement.textContent?.trim();
    if (!mediainfoText) return;

    const parsedMediaInfo = parseMediaInfo(mediainfoText);
    if (!parsedMediaInfo) return;

    // Update video information
    if (parsedMediaInfo.video?.[0]) {
      const video = parsedMediaInfo.video[0];

      if (video.width && video.height) {
        parsed.resolution = `${video.width}x${video.height}`;
      }

      if (video.displayAspectRatio) {
        parsed.aspectRatio = video.displayAspectRatio;
      }

      if (video.format) {
        const codecMap: Record<string, string> = {
          AVC: "AVC",
          HEVC: "HEVC",
          "H.264": "AVC",
          "H.265": "HEVC",
        };

        let codec = codecMap[video.format] || video.format;
        if (video.bitDepth === 10) codec += "-10b";
        else if (video.bitDepth === 12) codec += "-12b";

        parsed.videoCodec = codec;
      }
    }

    // Update audio information
    if (parsedMediaInfo.audio?.[0]) {
      const primaryAudio = parsedMediaInfo.audio[0];

      if (primaryAudio.format) {
        const audioCodecMap: Record<string, string> = {
          "AC-3": "AC3",
          "E-AC-3": "E-AC3",
          "DTS-HD": "DTS-HD",
          "DTS-HD MA": "DTS-HD MA",
        };
        parsed.audio = audioCodecMap[primaryAudio.format] || primaryAudio.format;
      }

      if (primaryAudio.channels) {
        const channelMap: Record<number, string> = {
          1: "1.0",
          2: "2.0",
          6: "5.1",
          8: "7.1",
        };
        parsed.audioChannels = channelMap[primaryAudio.channels] || primaryAudio.channels.toString();
      }

      // Check for dual audio
      const languages = new Set(
        parsedMediaInfo.audio.map((track) => track.language).filter((lang) => lang && lang !== "Undefined"),
      );
      if (languages.size > 1) {
        parsed.hasDualAudio = true;
      }
    }

    // Update container information
    if (parsedMediaInfo.general?.format) {
      const containerMap: Record<string, string> = {
        Matroska: "MKV",
        "MPEG-4": "MP4",
        "Audio Video Interleave": "AVI",
      };
      parsed.container = containerMap[parsedMediaInfo.general.format] || parsedMediaInfo.general.format;
    }

    // Store the full mediaInfo for advanced features
    parsed.mediaInfo = {
      video: parsedMediaInfo.video?.[0]
        ? {
            codec: parsed.videoCodec,
            bitrate: String(parsedMediaInfo.video[0].bitRate || ""),
            width: parsedMediaInfo.video[0].width || 0,
            height: parsedMediaInfo.video[0].height || 0,
            framerate: String(parsedMediaInfo.video[0].frameRate || ""),
          }
        : undefined,
      audio: parsedMediaInfo.audio?.map((track) => ({
        codec: track.format || "",
        bitrate: String(track.bitRate || ""),
        channels: track.channels?.toString() || "",
        language: track.language || "",
      })),
      subtitles: parsedMediaInfo.text?.map((track) => ({
        language: track.language || "",
        type: track.format || "",
      })),
    };
  } catch (error) {
    console.error(`AB Suite: Error parsing mediainfo for torrent ${torrentId}:`, error);
  }
}
