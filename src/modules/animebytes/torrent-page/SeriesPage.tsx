import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useSeaDexUpdates } from "@/stores/seadex";
import { useSettingsStore } from "@/stores/settings";
import { extractTorrentData } from "./data-extraction";
import { TorrentTable } from "./TorrentTable";
import type { ParsedTorrentRow } from "./types";

interface SeriesTableData {
  torrents: ParsedTorrentRow[];
  originalTable: HTMLTableElement;
  containerRef: HTMLDivElement;
}

/**
 * Component for series.php pages that handles multiple torrent tables.
 * Each table (anime, manga, music) is processed independently using the existing logic.
 */
export function SeriesPage() {
  const { tableRestructureEnabled, mediainfoParserEnabled } = useSettingsStore();
  const [tablesData, setTablesData] = useState<SeriesTableData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeSeriesPage = () => {
    // Find all original torrent tables
    const originalTables = document.querySelectorAll(".torrent_table") as NodeListOf<HTMLTableElement>;

    if (originalTables.length === 0 || isInitialized) {
      return;
    }

    console.log(`AB Suite: Found ${originalTables.length} tables on series page`);

    const newTablesData: SeriesTableData[] = [];

    for (let i = 0; i < originalTables.length; i++) {
      const originalTable = originalTables[i];

      try {
        // Extract data from this table using existing logic
        const extractedTorrents = extractTorrentData(originalTable, mediainfoParserEnabled);

        if (extractedTorrents.length === 0) {
          console.log(`AB Suite: No torrents found in table ${i}, skipping`);
          continue;
        }

        // Hide the original table
        originalTable.style.display = "none";

        // Create container for our modern table
        const container = document.createElement("div");
        container.id = `ab-modern-torrent-table-${i}`;
        container.className = "ab-modern-table-container";
        originalTable.parentNode?.insertBefore(container, originalTable);

        newTablesData.push({
          torrents: extractedTorrents,
          originalTable,
          containerRef: container,
        });

        console.log(`AB Suite: Initialized table ${i} with ${extractedTorrents.length} torrents`);
      } catch (error) {
        console.error(`AB Suite: Failed to initialize table ${i}:`, error);
      }
    }

    if (newTablesData.length > 0) {
      setTablesData(newTablesData);
      setIsInitialized(true);
      console.log(`AB Suite: Series page initialized with ${newTablesData.length} tables`);
    }
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

  // Listen for SeaDex updates and re-extract data for all tables
  useSeaDexUpdates(() => {
    if (!isInitialized || tablesData.length === 0) return;

    console.log("AB Suite: SeaDex processing complete, re-extracting data for all tables");

    try {
      const updatedTablesData = tablesData.map((tableData) => ({
        ...tableData,
        torrents: extractTorrentData(tableData.originalTable, mediainfoParserEnabled),
      }));

      setTablesData(updatedTablesData);
    } catch (error) {
      console.error("AB Suite: Failed to re-extract data after SeaDex update", error);
    }
  });

  // Render each table into its container
  useEffect(() => {
    if (!isInitialized || tablesData.length === 0) {
      return;
    }

    tablesData.forEach((tableData) => {
      if (tableData.torrents.length > 0) {
        render(
          <TorrentTable torrents={tableData.torrents} originalTable={tableData.originalTable} />,
          tableData.containerRef,
        );
      }
    });
  }, [isInitialized, tablesData]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
