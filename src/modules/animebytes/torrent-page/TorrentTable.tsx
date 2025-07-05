import { ChevronDown, ChevronRight } from "lucide-preact";
import { Fragment } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useSeaDexStore, useSeaDexUpdates } from "@/stores/seadex";
import { useSettingsStore } from "@/stores/settings";
import { extractGroupedTorrentData } from "./data-extraction";
import { TorrentHeader } from "./TorrentHeader";
import { TorrentRow } from "./TorrentRow";
import type { GroupedTorrents, GroupHeader, ParsedTorrentRow, SortColumn, SortDirection, TableSection } from "./types";

interface TorrentTableProps {
  torrents: ParsedTorrentRow[];
  originalTable?: HTMLTableElement; // Add reference to original table for grouped extraction
}

/**
 * Section header component with expand/collapse functionality
 */
function SectionHeader({
  section,
  isCollapsed,
  onToggle,
  isOddSection,
}: {
  section: TableSection | GroupHeader;
  isCollapsed: boolean;
  onToggle: () => void;
  isOddSection: boolean;
}) {
  // Group headers use their own class, section headers use alternating colors
  const headerClass =
    section.type === "group"
      ? "ab-group-header"
      : isOddSection
        ? "ab-section-header ab-group-odd"
        : "ab-section-header";

  return (
    <tr className={headerClass} onClick={onToggle} style={{ cursor: "pointer" }}>
      <td colSpan={100}>
        {section.type === "group" && section.fullHtml ? (
          // Render full HTML content for group headers
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ marginTop: "4px" }}>
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
            <div dangerouslySetInnerHTML={{ __html: section.fullHtml }} />
          </div>
        ) : (
          // Simple text display for section headers
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            <strong>{section.title}</strong>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * The main table component that manages UI state and renders the torrent data.
 * This component handles sorting, expanded rows, and renders the header and rows.
 * It also reactively updates when SeaDex data becomes available.
 * Now supports section headers with group-aware sorting and section collapse/expand.
 */
export function TorrentTable({ torrents, originalTable }: TorrentTableProps) {
  const {
    compactResolutionMode,
    showRegionColumn,
    showDualAudioColumn,
    mediainfoParserEnabled,
    sectionsCollapsedByDefault,
  } = useSettingsStore();
  const seadexStore = useSeaDexStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Extract grouped data if we have the original table, otherwise use flat data
  const groupedData = useMemo(() => {
    if (originalTable) {
      return extractGroupedTorrentData(originalTable, mediainfoParserEnabled);
    }

    // Fallback: create a single section with all torrents
    return {
      sections: [
        {
          section: null,
          torrents: torrents,
        },
      ],
    } as GroupedTorrents;
  }, [originalTable, torrents, mediainfoParserEnabled]);

  // Initialize sections as collapsed or expanded based on setting
  useEffect(() => {
    const sectionsWithIds = groupedData.sections
      .filter(({ section }) => section !== null)
      .map(({ section }) => section?.id)
      .filter((id): id is string => id !== undefined);

    if (sectionsWithIds.length > 0) {
      if (sectionsCollapsedByDefault) {
        setCollapsedSections(new Set(sectionsWithIds));
      } else {
        setCollapsedSections(new Set());
      }
    }
  }, [groupedData, sectionsCollapsedByDefault]);

  // Enhance torrents with SeaDex data from the store
  const enhancedGroupedData = useMemo(() => {
    return {
      sections: groupedData.sections.map(({ section, torrents: sectionTorrents }) => ({
        section,
        torrents: sectionTorrents.map((torrent) => {
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
        }),
      })),
    };
  }, [groupedData, seadexStore.data, seadexStore.lastUpdate]);

  // Listen for SeaDex updates and force re-render
  useSeaDexUpdates(() => {
    // The enhancedGroupedData memo will automatically update due to store changes
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

  // Toggle section collapse
  const toggleSectionCollapsed = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Toggle all sections
  const toggleAllSections = () => {
    const sectionsWithIds = sortedGroupedData.sections
      .filter(({ section }) => section !== null)
      .map(({ section }) => section?.id)
      .filter((id): id is string => id !== undefined);

    if (sectionsWithIds.length === 0) return;

    // If all sections are expanded (collapsedSections is empty or doesn't contain any section IDs)
    const allExpanded = sectionsWithIds.every((id) => !collapsedSections.has(id));

    if (allExpanded) {
      // Collapse all sections
      setCollapsedSections(new Set(sectionsWithIds));
    } else {
      // Expand all sections
      setCollapsedSections(new Set());
    }
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

  // Memoized sorted grouped data - sort within groups, preserve group order
  const sortedGroupedData = useMemo(() => {
    if (!sortColumn) return enhancedGroupedData;

    return {
      sections: enhancedGroupedData.sections.map(({ section, torrents: sectionTorrents }) => ({
        section,
        torrents: sortTorrents([...sectionTorrents], sortColumn, sortDirection),
      })),
    };
  }, [enhancedGroupedData, sortColumn, sortDirection]);

  // Flatten for total count check
  const totalTorrents = sortedGroupedData.sections.reduce(
    (total, { torrents: sectionTorrents }) => total + sectionTorrents.length,
    0,
  );

  // Check if there are any sections
  const hasAnySections = sortedGroupedData.sections.some(({ section }) => section !== null);

  // Check if all sections are expanded
  const allSectionsExpanded = sortedGroupedData.sections
    .filter(({ section }) => section !== null)
    .every(({ section }) => section?.id && !collapsedSections.has(section.id));

  if (totalTorrents === 0) {
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
          hasAnySections={hasAnySections}
          allSectionsExpanded={allSectionsExpanded}
          onToggleAllSections={toggleAllSections}
        />
        <tbody>
          {sortedGroupedData.sections.map(({ section, torrents: sectionTorrents }, sectionIndex) => {
            const sectionId = section?.id || `section_${sectionIndex}`;

            // Check if this section should be hidden due to a collapsed group
            let isHiddenByGroup = false;
            if (section?.type === "section") {
              // Find the last group header before this section
              for (let i = sectionIndex - 1; i >= 0; i--) {
                const prevSection = sortedGroupedData.sections[i].section;
                if (prevSection?.type === "group") {
                  isHiddenByGroup = collapsedSections.has(prevSection.id);
                  break;
                }
              }
            }

            const isCollapsed = section ? collapsedSections.has(sectionId) : false;
            const isOddGroup = sectionIndex % 2 === 1;

            return (
              <Fragment key={sectionId}>
                {section && !isHiddenByGroup && (
                  <SectionHeader
                    section={section}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleSectionCollapsed(sectionId)}
                    isOddSection={isOddGroup}
                  />
                )}
                {!isCollapsed &&
                  !isHiddenByGroup &&
                  sectionTorrents.map((torrent) => (
                    <TorrentRow
                      key={torrent.torrentId}
                      torrent={torrent}
                      isExpanded={expandedRows.has(torrent.torrentId)}
                      onToggleExpanded={toggleRowExpanded}
                      compactResolutionMode={compactResolutionMode}
                      showRegionColumn={showRegionColumn}
                      showDualAudioColumn={showDualAudioColumn}
                      isOddGroup={isOddGroup}
                    />
                  ))}
              </Fragment>
            );
          })}
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

    // High-value flags
    if (flagLower.includes("freeleech")) score += 10;
    if (flagLower.includes("seadx")) {
      if (flagLower.includes("best")) score += 8;
      else score += 6;
    }

    // Medium-value flags
    if (flagLower.includes("golden") || flagLower.includes("popcorn")) score += 5;
    if (flagLower.includes("scene") || flagLower.includes("p2p")) score += 3;

    // Low-value flags
    if (flagLower.includes("trump") || flagLower.includes("proper")) score += 2;
    if (flagLower.includes("repack") || flagLower.includes("fix")) score += 1;
  }

  return score;
}
