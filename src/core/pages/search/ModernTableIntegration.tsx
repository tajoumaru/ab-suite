import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { err, log } from "@/lib/utils/logging";
import { useSettingsStore } from "@/lib/state/settings";
import { extractTorrentData } from "@/core/features/modern-table/data-extraction";
import { TorrentTable } from "@/core/features/modern-table/TorrentTable";

interface SearchTableInfo {
  table: HTMLTableElement;
  container: HTMLElement;
  originalDisplay: string;
}

/**
 * ModernTableIntegration for search pages
 * Replaces original torrent tables with modern table components
 */
export function ModernTableIntegration() {
  const { tableRestructureEnabled } = useSettingsStore();
  const [searchTables, setSearchTables] = useState<SearchTableInfo[]>([]);
  const containerRefs = useRef<Map<HTMLTableElement, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!tableRestructureEnabled) {
      return;
    }

    // Only run on search pages
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    // Skip if this is a single torrent page (has torrentid parameter)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("torrentid")) {
      return;
    }

    const initializeSearchTables = () => {
      const tables: SearchTableInfo[] = [];

      // Find all torrent tables on search pages
      const torrentTables = document.querySelectorAll(".torrent_group") as NodeListOf<HTMLTableElement>;

      torrentTables.forEach((table) => {
        // Check if this table has torrent rows (search page tables have class "torrent")
        const torrentRows = table.querySelectorAll("tr.torrent");
        if (torrentRows.length === 0) {
          return;
        }

        // Find the container element (usually the parent .group_torrents)
        const container = table.closest(".group_torrents") || table.parentElement;
        if (!container) {
          return;
        }

        // Check if we've already processed this table
        if (containerRefs.current.has(table)) {
          return;
        }

        const originalDisplay = (container as HTMLElement).style.display;

        tables.push({
          table,
          container: container as HTMLElement,
          originalDisplay,
        });

        // Hide the original table
        (container as HTMLElement).style.display = "none";

        // Create container for modern table
        const modernContainer = document.createElement("div");
        modernContainer.className = "ab-modern-table-replacement";

        // Insert the modern container after the original container
        container.parentNode?.insertBefore(modernContainer, container.nextSibling);

        // Store reference
        containerRefs.current.set(table, modernContainer);
      });

      if (tables.length > 0) {
        setSearchTables((prev) => [...prev, ...tables]);
        log("Found", tables.length, "search page torrent tables to enhance");
      }
    };

    // Try to initialize immediately
    initializeSearchTables();

    // Watch for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      let shouldReprocess = false;

      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if new torrent tables were added
            if (
              element.matches(".torrent_group, .group_torrents") ||
              element.querySelector(".torrent_group, .group_torrents")
            ) {
              shouldReprocess = true;
              break;
            }
          }
        }
        if (shouldReprocess) break;
      }

      if (shouldReprocess) {
        setTimeout(() => {
          initializeSearchTables();
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      // Restore original tables if component unmounts
      searchTables.forEach(({ table, container, originalDisplay }) => {
        container.style.display = originalDisplay;
        const modernContainer = containerRefs.current.get(table);
        if (modernContainer) {
          modernContainer.remove();
        }
      });
      containerRefs.current.clear();
    };
  }, [tableRestructureEnabled]);

  // Render modern tables when search tables are found
  useEffect(() => {
    if (searchTables.length === 0) {
      return;
    }

    searchTables.forEach(({ table }) => {
      const container = containerRefs.current.get(table);
      if (!container) {
        return;
      }

      try {
        // Extract torrent data from the search page table using main data extraction
        const torrents = extractTorrentData(table);

        if (torrents.length > 0) {
          // Render the modern table with proper data extraction
          render(<TorrentTable torrents={torrents} originalTable={table} isSeriesPage={false} />, container);

          log("Rendered modern table for search page with", torrents.length, "torrents");
        }
      } catch (error) {
        err("Error rendering modern table for search page:", error);

        // Restore original table on error
        const originalContainer = searchTables.find((info) => info.table === table)?.container;
        if (originalContainer) {
          originalContainer.style.display = "";
        }
      }
    });
  }, [searchTables]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
