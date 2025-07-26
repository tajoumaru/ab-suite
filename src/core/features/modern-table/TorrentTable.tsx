// ChevronDown, ChevronRight now imported in SectionHeader component
import { Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { useSeaDexStore, useSeaDexUpdates } from "@/core/shared/seadex";
import { useSettingsStore } from "@/lib/state/settings";
import { log, time, timeEnd } from "@/lib/utils/logging";
import { SectionHeader } from "./components/SectionHeader";
import { useRowExpansion } from "./hooks/useRowExpansion";
import { useSectionManagement } from "./hooks/useSectionManagement";
import { useTorrentSorting } from "./hooks/useTorrentSorting";
import { TorrentHeader } from "./TorrentHeader";
import { TorrentRow } from "./TorrentRow";
import type { TorrentTableProps } from "./types";

// TorrentTableProps is now imported from types.ts

// SectionHeader component moved to ./components/SectionHeader.tsx

/**
 * The main table component that manages UI state and renders the torrent data.
 * This component handles sorting, expanded rows, and renders the header and rows.
 * It also reactively updates when SeaDex data becomes available.
 * Now supports section headers with group-aware sorting and section collapse/expand.
 */
export function TorrentTable({ groupedData, tableType = "anime", isSeriesPage = false }: TorrentTableProps) {
  time("TorrentTable component render");
  log("TorrentTable component rendering", {
    sectionsCount: groupedData.sections.length,
    totalTorrents: groupedData.sections.reduce((sum, s) => sum + s.torrents.length, 0),
    tableType,
  });
  const { compactResolutionMode, showRegionColumn, showDualAudioColumn, sectionsCollapsedByDefault } =
    useSettingsStore();
  const seadexStore = useSeaDexStore();

  // Use custom hooks for state management
  const { collapsedSections, toggleSectionCollapsed, createToggleAllSections } = useSectionManagement(
    groupedData,
    sectionsCollapsedByDefault,
  );

  // Section management is now handled by the useSectionManagement hook

  // Enhance torrents with Seadex data from the store
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

  // Use custom hooks for state management
  const { expandedRows, toggleRowExpanded } = useRowExpansion(enhancedGroupedData, isSeriesPage);

  // Listen for SeaDex updates and force re-render
  useSeaDexUpdates(() => {
    // The enhancedGroupedData memo will automatically update due to store changes
    log("Seadex data updated, table will re-render");
  });

  // Row expansion is now handled by the useRowExpansion hook

  // Use custom hooks for state management
  const { sortColumn, sortDirection, handleSort, sortedGroupedData } = useTorrentSorting(enhancedGroupedData);

  // Create the toggle all sections function with current data
  const toggleAllSections = createToggleAllSections(sortedGroupedData);

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
    timeEnd("TorrentTable component render");
    return null;
  }

  const result = (
    <div overflow="auto" size-w="full">
      <table size-w="full" border="1px solid collapse [hsl(0,0%,20%)]">
        <TorrentHeader
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          tableType={tableType}
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
                      tableType={tableType}
                      compactResolutionMode={compactResolutionMode}
                      showRegionColumn={showRegionColumn}
                      showDualAudioColumn={showDualAudioColumn}
                      isOddGroup={isOddGroup}
                      isSeriesPage={isSeriesPage}
                    />
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  timeEnd("TorrentTable component render");
  return result;
}

// Sorting logic has been moved to ./utils/sorting.ts
