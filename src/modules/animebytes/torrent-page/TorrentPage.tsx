import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useSeaDexUpdates } from "@/stores/seadex";
import { useSettingsStore } from "@/stores/settings";
import { extractTorrentData } from "./data-extraction";
import { TorrentTable } from "./TorrentTable";
import type { ParsedTorrentRow } from "./types";

/**
 * Root component for the torrent page that implements the "declarative takeover" approach.
 * This component:
 * 1. Finds the original torrent table (anchor)
 * 2. Extracts data from it once into clean JS objects
 * 3. Hides the original table
 * 4. Renders our Preact-based table with the extracted data
 * 5. Reactively updates when SeaDex data becomes available
 */
export function TorrentPage() {
  const { tableRestructureEnabled, mediainfoParserEnabled } = useSettingsStore();
  const [torrents, setTorrents] = useState<ParsedTorrentRow[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalTableRef = useRef<HTMLTableElement | null>(null);

  const initializeTorrentPage = () => {
    // Find the original torrent table (our anchor)
    const originalTable = document.querySelector(".torrent_table") as HTMLTableElement;

    if (!originalTable || isInitialized) {
      return;
    }

    try {
      // Extract data from the original table
      const extractedTorrents = extractTorrentData(originalTable, mediainfoParserEnabled);

      if (extractedTorrents.length === 0) {
        return;
      }

      // Store reference to original table for re-extraction
      originalTableRef.current = originalTable;

      // Hide the original table
      originalTable.style.display = "none";

      // Create container for our Preact app
      const container = document.createElement("div");
      container.id = "ab-modern-torrent-table";
      originalTable.parentNode?.insertBefore(container, originalTable);

      // Store the container reference for rendering
      containerRef.current = container;

      // Set the extracted data and mark as initialized
      setTorrents(extractedTorrents);
      setIsInitialized(true);

      console.log("AB Suite: Torrent page initialized with", extractedTorrents.length, "torrents");
    } catch (error) {
      console.error("AB Suite: Failed to initialize torrent page", error);
    }
  };

  useEffect(() => {
    if (!tableRestructureEnabled) {
      return;
    }

    // Only run on torrent pages
    if (!window.location.pathname.includes("/torrents.php")) {
      return;
    }

    // Initialize immediately - no artificial delay
    initializeTorrentPage();
  }, [tableRestructureEnabled, mediainfoParserEnabled, isInitialized]);

  // Listen for SeaDex updates and re-extract data to pick up SeaDex classes
  useSeaDexUpdates(() => {
    if (!isInitialized || !originalTableRef.current) return;

    console.log("AB Suite: SeaDex processing complete, re-extracting torrent data");

    try {
      const updatedTorrents = extractTorrentData(originalTableRef.current, mediainfoParserEnabled);
      setTorrents(updatedTorrents);
    } catch (error) {
      console.error("AB Suite: Failed to re-extract torrent data after SeaDex update", error);
    }
  });

  // Render the table into the container when we have data
  useEffect(() => {
    if (isInitialized && containerRef.current && torrents.length > 0) {
      render(
        <TorrentTable torrents={torrents} originalTable={originalTableRef.current || undefined} />,
        containerRef.current,
      );
    }
  }, [isInitialized, torrents]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
