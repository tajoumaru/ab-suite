import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useSeaDexUpdates } from "@/stores/seadex";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";
import { useMediaInfo } from "../hooks/useMediaInfo";
import {
  Ratings,
  detectTableType,
  ExternalLinksBar,
  extractTorrentData,
  type ParsedTorrentRow,
  TorrentTable,
} from "../modern-table";

/**
 * Comprehensive component that implements declarative takeover for the entire torrent group page.
 * This component:
 * 1. Finds the original torrent table and group header (anchors)
 * 2. Extracts data from them once into clean JS objects
 * 3. Hides the original elements
 * 4. Renders our enhanced Preact-based components with the extracted data
 * 5. Reactively updates when SeaDex data becomes available
 *
 * This replaces both the old TorrentPage and ExternalLinks components.
 */
export function TorrentGroupPage() {
  const { tableRestructureEnabled, mediainfoParserEnabled, anilistIntegrationEnabled, RatingsEnabled } =
    useSettingsStore();
  const [torrents, setTorrents] = useState<ParsedTorrentRow[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLSpanElement>(null);
  const ratingsContainerRef = useRef<HTMLDivElement>(null);
  const originalTableRef = useRef<HTMLTableElement | null>(null);
  const mediaInfo = useMediaInfo();

  const initializeTorrentGroupPage = () => {
    // Find the original torrent table (our anchor)
    const originalTable = document.querySelector(".torrent_table") as HTMLTableElement;

    if (!originalTable || isInitialized) {
      return;
    }

    try {
      // Detect table type and extract data from the original table
      const tableType = detectTableType(originalTable);
      const extractedTorrents = extractTorrentData(originalTable, mediainfoParserEnabled, tableType);

      if (extractedTorrents.length === 0) {
        return;
      }

      log(`AB Suite: Detected table type '${tableType}' for torrent group page`);

      // Store reference to original table for re-extraction
      originalTableRef.current = originalTable;

      // Hide the original table
      originalTable.style.display = "none";

      // Create container for our enhanced torrent table
      const tableContainer = document.createElement("div");
      tableContainer.id = "ab-modern-torrent-table";
      originalTable.parentNode?.insertBefore(tableContainer, originalTable);

      // Store the container reference for rendering
      tableContainerRef.current = tableContainer;

      // Set the extracted data and mark as initialized
      setTorrents(extractedTorrents);
      setIsInitialized(true);

      log("AB Suite: Torrent group page initialized with", extractedTorrents.length, "torrents");
    } catch (error) {
      console.error("AB Suite: Failed to initialize torrent group page", error);
    }
  };

  useEffect(() => {
    if (!tableRestructureEnabled) {
      return;
    }

    // Only run on torrent pages (both torrents.php and torrents2.php for music)
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    // Initialize immediately - no artificial delay
    initializeTorrentGroupPage();
  }, [tableRestructureEnabled, mediainfoParserEnabled, isInitialized]);

  // Listen for SeaDex updates and re-extract data to pick up SeaDex classes
  useSeaDexUpdates(() => {
    if (!isInitialized || !originalTableRef.current) return;

    log("AB Suite: SeaDex processing complete, re-extracting torrent data");

    try {
      const tableType = detectTableType(originalTableRef.current);
      const updatedTorrents = extractTorrentData(originalTableRef.current, mediainfoParserEnabled, tableType);
      setTorrents(updatedTorrents);
    } catch (error) {
      console.error("AB Suite: Failed to re-extract torrent data after SeaDex update", error);
    }
  });

  // Handle external links integration
  useEffect(() => {
    if (!anilistIntegrationEnabled || !mediaInfo) {
      return;
    }

    // Only run on torrent pages (both torrents.php and torrents2.php for music)
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    const integrateExternalLinks = () => {
      // Find the header element (last h3 a element)
      const headers = document.querySelectorAll("h3 a");
      const lastHeader = headers[headers.length - 1] as HTMLAnchorElement;

      if (!lastHeader) {
        return;
      }

      // Check if links already exist to prevent duplication
      if (lastHeader.parentNode?.querySelector(".ab-external-links")) {
        return;
      }

      // Create container for external links
      const linksContainer = document.createElement("span");
      lastHeader.parentNode?.insertBefore(linksContainer, lastHeader.nextSibling);

      // Store the container reference
      headerContainerRef.current = linksContainer;

      log("AB Suite: External links container created");
    };

    integrateExternalLinks();
  }, [anilistIntegrationEnabled, mediaInfo]);

  // Handle comprehensive ratings integration
  useEffect(() => {
    if (!RatingsEnabled || !mediaInfo?.apiData || !isInitialized) {
      return;
    }

    // Only run on torrent pages
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    const integrateRatings = () => {
      // Find the modern torrent table element
      const modernTable = document.querySelector("#ab-modern-torrent-table");

      if (!modernTable) {
        return;
      }

      // Check if ratings already exist to prevent duplication
      if (document.querySelector(".ab-comprehensive-ratings")) {
        return;
      }

      // Create container for ratings
      const ratingsContainer = document.createElement("div");
      ratingsContainer.id = "ab-comprehensive-ratings-container";

      // Insert before the modern torrent table
      modernTable.parentNode?.insertBefore(ratingsContainer, modernTable);

      // Store the container reference
      ratingsContainerRef.current = ratingsContainer;

      log("AB Suite: Comprehensive ratings container created");
    };

    integrateRatings();
  }, [RatingsEnabled, mediaInfo, isInitialized]);

  // Render the components into their containers when we have data
  useEffect(() => {
    if (isInitialized && tableContainerRef.current && torrents.length > 0) {
      render(
        <TorrentTable torrents={torrents} originalTable={originalTableRef.current || undefined} isSeriesPage={false} />,
        tableContainerRef.current,
      );
    }
  }, [isInitialized, torrents]);

  // Render external links when we have media info
  useEffect(() => {
    if (anilistIntegrationEnabled && mediaInfo && headerContainerRef.current) {
      render(<ExternalLinksBar mediaInfo={mediaInfo} />, headerContainerRef.current);
    }
  }, [anilistIntegrationEnabled, mediaInfo]);

  // Render comprehensive ratings when we have API data
  useEffect(() => {
    if (RatingsEnabled && mediaInfo?.apiData && ratingsContainerRef.current) {
      render(<Ratings apiData={mediaInfo.apiData} mediaInfo={mediaInfo} />, ratingsContainerRef.current);
    }
  }, [RatingsEnabled, mediaInfo]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
