import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { err, log, time, timeEnd } from "@/lib/utils/logging";
import { useSeaDexUpdates } from "@/core/shared/seadex";
import { useSettingsStore } from "@/lib/state/settings";
import {
  detectTableType,
  extractTorrentData,
  type ParsedTorrentRow,
  type TableType,
} from "@/core/features/modern-table";
import { SeriesTableContainer } from "./SeriesTableContainer";

interface SeriesTableData {
  id: string;
  title: string;
  tableType: TableType;
  torrents: ParsedTorrentRow[];
  originalTable: HTMLTableElement;
}

/**
 * Component for series.php pages that handles multiple torrent tables.
 * Each table (anime, manga, music) is processed independently using the existing logic.
 */
export function SeriesPage() {
  const { tableRestructureEnabled, mediainfoParserEnabled } = useSettingsStore();
  const [tablesData, setTablesData] = useState<SeriesTableData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [collapsedTables, setCollapsedTables] = useState<Set<string>>(new Set());

  // Helper function to get table title based on type and ID
  const getTableTitle = (tableType: TableType, tableId?: string): string => {
    if (tableType === "music" && tableId) {
      const musicTableMap: Record<string, string> = {
        album_table: "Album",
        soundtrack_table: "Soundtrack",
        single_table: "Single",
        ep_table: "EP",
        compilation_table: "Compilation",
        remix_cd_table: "Remix CD",
        live_album_table: "Live Album",
        spokenword_table: "Spoken Word",
        image_cd_table: "Image CD",
        vocal_cd_table: "Vocal CD",
      };
      return musicTableMap[tableId] || "Music";
    } else if (tableType === "anime" && tableId) {
      const animeTableMap: Record<string, string> = {
        anime_table: "Anime",
        live_action_table: "Live Action",
        pv_table: "PV",
        live_table: "Live",
      };
      return animeTableMap[tableId] || "Anime";
    } else {
      const tableTitleMap: Record<string, string> = {
        anime: "Anime",
        printed_media: "Printed Media",
        games: "Games",
        music: "Music",
      };
      return tableTitleMap[tableType] || "Torrents";
    }
  };

  const initializeSeriesPage = () => {
    // Find all original torrent tables
    const originalTables = document.querySelectorAll(".torrent_table") as NodeListOf<HTMLTableElement>;

    if (originalTables.length === 0 || isInitialized) {
      return;
    }

    log(`Found ${originalTables.length} tables on series page`);

    const newTablesData: SeriesTableData[] = [];

    for (let i = 0; i < originalTables.length; i++) {
      const originalTable = originalTables[i];

      try {
        // Detect table type and extract data
        const tableType = detectTableType(originalTable);
        const extractedTorrents = extractTorrentData(originalTable, mediainfoParserEnabled, tableType);

        if (extractedTorrents.length === 0) {
          log(`No torrents found in table ${i}, skipping`);
          continue;
        }

        log(`Detected table type '${tableType}' for table ${i}`);

        // Hide the original table
        originalTable.style.display = "none";

        // Get table title
        const title = getTableTitle(tableType, originalTable.id);

        newTablesData.push({
          id: `table-${i}`,
          title,
          tableType,
          torrents: extractedTorrents,
          originalTable,
        });

        log(`Initialized table ${i} with ${extractedTorrents.length} torrents`);
      } catch (error) {
        err(`Failed to initialize table ${i}:`, error);
      }
    }

    if (newTablesData.length > 0) {
      setTablesData(newTablesData);
      setIsInitialized(true);
      log(`Series page initialized with ${newTablesData.length} tables`);
    }
  };

  // Toggle collapse state for a specific table
  const toggleTableCollapse = (tableId: string) => {
    time(`toggleTableCollapse-${tableId}`);
    log(`Starting toggle for table ${tableId}`);

    setCollapsedTables((prev) => {
      time(`toggleTableCollapse-setState-${tableId}`);
      const newSet = new Set(prev);
      if (newSet.has(tableId)) {
        newSet.delete(tableId);
        log(`Expanding table ${tableId}`);
      } else {
        newSet.add(tableId);
        log(`Collapsing table ${tableId}`);
      }
      timeEnd(`toggleTableCollapse-setState-${tableId}`);
      return newSet;
    });

    timeEnd(`toggleTableCollapse-${tableId}`);
  };

  useEffect(() => {
    if (!tableRestructureEnabled) {
      return;
    }

    // Only run on series pages
    if (!window.location.pathname.includes("/series.php")) {
      return;
    }

    initializeSeriesPage();
  }, [tableRestructureEnabled, mediainfoParserEnabled, isInitialized]);

  // Listen for Seadex updates and re-extract data for all tables
  useSeaDexUpdates(() => {
    if (!isInitialized || tablesData.length === 0) return;

    log("Seadex processing complete, re-extracting data for all tables");

    try {
      const updatedTablesData = tablesData.map((tableData) => {
        const tableType = detectTableType(tableData.originalTable);
        return {
          ...tableData,
          torrents: extractTorrentData(tableData.originalTable, mediainfoParserEnabled, tableType),
        };
      });

      setTablesData(updatedTablesData);
    } catch (error) {
      err("Failed to re-extract data after Seadex update", error);
    }
  });

  // Create a container in the DOM and render our components initially
  useEffect(() => {
    time("SeriesPage initial setup");
    log("Initial setup triggered", {
      isInitialized,
      tablesDataLength: tablesData.length,
    });

    if (!isInitialized || tablesData.length === 0) {
      log("Initial setup early return - not initialized or no data");
      timeEnd("SeriesPage initial setup");
      return;
    }

    time("DOM manipulation");
    // Create a single container for all our tables
    const existingContainer = document.getElementById("ab-series-tables-container");
    if (existingContainer) {
      existingContainer.remove();
    }

    const container = document.createElement("div");
    container.id = "ab-series-tables-container";

    // Insert after the first original table (which should be hidden)
    const firstTable = document.querySelector(".torrent_table");
    if (firstTable?.parentNode) {
      firstTable.parentNode.insertBefore(container, firstTable);
      timeEnd("DOM manipulation");

      time("Initial Preact render");
      // Render all table containers
      render(
        <div>
          {tablesData.map((tableData) => (
            <SeriesTableContainer
              key={tableData.id}
              tableType={tableData.tableType}
              title={tableData.title}
              torrents={tableData.torrents}
              originalTable={tableData.originalTable}
              isCollapsed={collapsedTables.has(tableData.id)}
              onToggleCollapse={() => toggleTableCollapse(tableData.id)}
            />
          ))}
        </div>,
        container,
      );
      timeEnd("Initial Preact render");
    } else {
      timeEnd("DOM manipulation");
    }

    timeEnd("SeriesPage initial setup");
  }, [isInitialized, tablesData]); // Remove collapsedTables from dependencies

  // Separate effect to handle collapse state changes without re-rendering everything
  useEffect(() => {
    time("SeriesPage collapse update");
    log("Collapse state update", {
      collapsedTablesSize: collapsedTables.size,
      collapsedTableIds: Array.from(collapsedTables),
    });

    if (!isInitialized || tablesData.length === 0) {
      timeEnd("SeriesPage collapse update");
      return;
    }

    const container = document.getElementById("ab-series-tables-container");
    if (container) {
      time("Collapse state Preact render");
      // Only update collapse states, don't recreate the entire structure
      render(
        <div>
          {tablesData.map((tableData) => (
            <SeriesTableContainer
              key={tableData.id}
              tableType={tableData.tableType}
              title={tableData.title}
              torrents={tableData.torrents}
              originalTable={tableData.originalTable}
              isCollapsed={collapsedTables.has(tableData.id)}
              onToggleCollapse={() => toggleTableCollapse(tableData.id)}
            />
          ))}
        </div>,
        container,
      );
      timeEnd("Collapse state Preact render");
    }

    timeEnd("SeriesPage collapse update");
  }, [collapsedTables]); // Only depend on collapse state changes

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
