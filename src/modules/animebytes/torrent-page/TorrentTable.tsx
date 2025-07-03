import { useMemo, useState } from "preact/hooks";
import { useSeaDexStore, useSeaDexUpdates } from "@/stores/seadex";
import { useSettingsStore } from "@/stores/settings";
import { TorrentHeader } from "./TorrentHeader";
import { TorrentRow } from "./TorrentRow";
import type { ParsedTorrentRow, SortColumn, SortDirection } from "./types";

interface TorrentTableProps {
  torrents: ParsedTorrentRow[];
}

/**
 * The main table component that manages UI state and renders the torrent data.
 * This component handles sorting, expanded rows, and renders the header and rows.
 * It also reactively updates when SeaDex data becomes available.
 */
export function TorrentTable({ torrents }: TorrentTableProps) {
  const { compactResolutionMode, showRegionColumn, showDualAudioColumn } = useSettingsStore();
  const seadexStore = useSeaDexStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Enhance torrents with SeaDex data from the store
  const enhancedTorrents = useMemo(() => {
    return torrents.map((torrent) => {
      const seadexData = seadexStore.getData(torrent.torrentId);

      if (seadexData) {
        return {
          ...torrent,
          seadex: seadexData,
          // Preserve any existing flags from DOM extraction, but prioritize store data
          isSeaDexBest: seadexData.isBest,
          isSeaDexAlt: !seadexData.isBest,
        };
      }

      // If no store data, keep any flags that were extracted from the DOM
      return torrent;
    });
  }, [torrents, seadexStore.data, seadexStore.lastUpdate]);

  // Listen for SeaDex updates and force re-render
  useSeaDexUpdates(() => {
    // The enhancedTorrents memo will automatically update due to store changes
    console.log("AB Suite: SeaDex data updated, table will re-render");
  });

  // Toggle row expansion
  const toggleRowExpanded = (torrentId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(torrentId)) {
        newSet.delete(torrentId);
      } else {
        newSet.add(torrentId);
      }
      return newSet;
    });
  };

  // Handle sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> unsorted
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        // Reset to unsorted state
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      // New column, start with ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Memoized sorted torrents using enhanced data
  const sortedTorrents = useMemo(() => {
    if (!sortColumn) return enhancedTorrents;

    return sortTorrents([...enhancedTorrents], sortColumn, sortDirection);
  }, [enhancedTorrents, sortColumn, sortDirection]);

  // Calculate column span for expanded rows
  const calculateColSpan = () => {
    let baseColumns = 16; // Base columns: download, group, format, container, codec, resolution, audio, channels, subtitles, size, snatches, seeders, leechers, flags, report
    if (!compactResolutionMode) baseColumns += 1; // aspect ratio column
    if (!showRegionColumn) baseColumns -= 1; // region column
    if (!showDualAudioColumn) baseColumns -= 1; // dual audio column
    return baseColumns;
  };

  if (torrents.length === 0) {
    return null;
  }

  return (
    <div className="ab-modern-table-container">
      <table className="ab-modern-torrent-table torrent_table">
        <TorrentHeader
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          showRegionColumn={showRegionColumn}
          showDualAudioColumn={showDualAudioColumn}
          compactResolutionMode={compactResolutionMode}
        />
        <tbody>
          {sortedTorrents.map((torrent) => (
            <TorrentRow
              key={torrent.torrentId}
              torrent={torrent}
              isExpanded={expandedRows.has(torrent.torrentId)}
              onToggleExpanded={toggleRowExpanded}
              colSpan={calculateColSpan()}
              compactResolutionMode={compactResolutionMode}
              showRegionColumn={showRegionColumn}
              showDualAudioColumn={showDualAudioColumn}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Sort torrents based on column and direction - comprehensive sorting logic from original
 */
function sortTorrents(torrents: ParsedTorrentRow[], column: SortColumn, direction: SortDirection): ParsedTorrentRow[] {
  if (!column) return torrents;

  const sortFunctions: Record<NonNullable<SortColumn>, (a: ParsedTorrentRow, b: ParsedTorrentRow) => number> = {
    group: (a, b) => compareStringsWithEmpties(a.group, b.group),
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

function parseSizeToBytes(sizeStr: string): number {
  if (!sizeStr) return 0;

  const match = sizeStr.match(/^([\d.]+)\s*(GiB|MiB|KiB|TiB|GB|MB|KB|TB|B)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  // Handle both binary (1024-based) and decimal (1000-based) units
  const binaryMultipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    KIB: 1024,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
    TB: 1024 ** 4,
    TIB: 1024 ** 4,
  };

  return value * (binaryMultipliers[unit] || 1);
}

function parseNumeric(str: string): number {
  const cleaned = str.replace(/[,\s]/g, "");
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
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
  let totalScore = 0;

  for (const flag of flags) {
    const flagContent = flag.toLowerCase();

    // Check for specific flag types and assign scores
    if (flagContent.includes("seadex") || flagContent.includes("seadex")) {
      if (flagContent.includes("best")) {
        totalScore += 8; // SeaDex Best = highest score
      } else {
        totalScore += 4; // SeaDex Alt = higher than freeleech+remaster
      }
    } else if (flagContent.includes("freeleech")) {
      totalScore += 2; // Freeleech = middle score
    } else if (flagContent.includes("rmstr") || flagContent.includes("remaster")) {
      totalScore += 1; // Remaster = lowest score
    }
    // Other flags don't add to score but still count in the total
  }

  return totalScore;
}
