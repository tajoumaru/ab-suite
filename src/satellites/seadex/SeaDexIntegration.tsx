import { render } from "preact";
import { useEffect } from "preact/hooks";
import { err, log } from "@/lib/utils/logging";
import { apiService } from "@/services/api";
import { seadexStore } from "@/core/shared/seadex";
import { useSettingsStore } from "@/lib/state/settings";
import type { TorrentInfo } from "@/types";
import { SeaDexIcon } from "./SeaDexIcon";
import { SeaDexTab } from "./SeaDexTab";

const TORRENT_ID_REGEX = /&torrentid=(\d+)/i;

// Extend Window interface for animebytes site functions
declare global {
  interface Window {
    switchTabs?: (element: HTMLAnchorElement) => void;
  }
}

export function SeaDexIntegration() {
  const { seadexEnabled } = useSettingsStore(["seadexEnabled"]);

  const getTorrentsOnPage = (): TorrentInfo[] => {
    const torrentSelectors = [
      '.group_torrent a[href*="&torrentid="]:last-of-type',
      '.torrent_properties > a[href*="&torrentid="]',
    ];

    const torrents: TorrentInfo[] = [];

    document.querySelectorAll(torrentSelectors.join(", ")).forEach((element) => {
      const a = element as HTMLAnchorElement;

      // Skip if already processed
      if (a.dataset.seadexProcessed) return;

      const torrentId = a.href.match(TORRENT_ID_REGEX)?.[1];
      if (torrentId) {
        const separator = a.closest(".group_torrent") && a.parentElement?.textContent?.includes("[DL]") ? " / " : " | ";

        torrents.push({
          torrentId,
          element: a,
          separator,
        });

        // Mark as processed
        a.dataset.seadexProcessed = "true";
      }
    });

    return torrents;
  };

  const processTorrents = async () => {
    if (!seadexEnabled) return;

    const torrents = getTorrentsOnPage();
    if (torrents.length === 0) return;

    try {
      seadexStore.setProcessing(true);

      let allLinkMaps = {};

      // Process in batches of 100
      for (let i = 0; i < torrents.length; i += 100) {
        const batch = torrents.slice(i, i + 100);
        const linkMap = await apiService.fetchSeaDex(batch);

        // Collect all link maps
        allLinkMaps = { ...allLinkMaps, ...linkMap };

        // Update the store with new SeaDex data - this will trigger reactive updates
        seadexStore.updateData(linkMap);

        for (const { element: a, torrentId, separator } of batch) {
          const entry = linkMap[torrentId];
          if (!entry) continue;

          // Add SeaDex icon
          const iconContainer = document.createElement("span");
          a.parentNode?.appendChild(iconContainer);

          render(<SeaDexIcon entry={entry} separator={separator} />, iconContainer);

          // Add SeaDex tab if tabs exist
          const tabsList = document.querySelector(`#tabs_${torrentId}`);
          const tabsContainer = tabsList?.parentElement;

          if (!tabsList || !tabsContainer) continue;

          const tabId = `seadex_${torrentId}`;
          if (document.getElementById(tabId)) continue;

          // Create tab item
          const newTabItem = document.createElement("li");
          const newTabLink = document.createElement("a");
          newTabLink.href = `#${tabId}`;
          newTabLink.textContent = "SeaDex";
          newTabLink.addEventListener("click", (e) => {
            e.preventDefault();
            // Use the site's tab switching function if available
            if (window.switchTabs) {
              window.switchTabs(newTabLink);
            }
          });
          newTabItem.appendChild(newTabLink);
          tabsList.appendChild(newTabItem);

          // Create tab content
          const newTabContent = document.createElement("div");
          newTabContent.id = tabId;
          newTabContent.style.display = "none";
          tabsContainer.appendChild(newTabContent);

          render(<SeaDexTab entry={entry} />, newTabContent);

          // Show tab if URL hash matches
          if (window.location.hash === `#${tabId}`) {
            newTabLink.click();
          }

          // Add SeaDex classes to the original torrent row for data extraction to pick up
          const torrentRow = a.closest(".group_torrent") as HTMLElement;
          if (torrentRow) {
            if (entry.isBest) {
              torrentRow.classList.add("seadex-best");
            } else {
              torrentRow.classList.add("seadex-alt");
            }
          }
        }
      }

      seadexStore.setProcessing(false);

      // Dispatch event for components listening to SeaDex completion
      const event = new CustomEvent("seadex-processing-complete", {
        detail: {
          processedTorrents: torrents.map((t) => t.torrentId),
          newData: Object.keys(allLinkMaps),
        },
      });

      document.dispatchEvent(event);
      log("SeaDex processing complete, dispatched event with", Object.keys(allLinkMaps).length, "entries");
    } catch (error) {
      err("AB Suite (SeaDex): Failed to process torrents", error);
      seadexStore.setProcessing(false);
    }
  };

  useEffect(() => {
    if (!seadexEnabled) return;

    // Process existing torrents
    processTorrents();

    // Watch for new torrents
    const observer = new MutationObserver(() => {
      processTorrents();
    });

    const contentEl = document.getElementById("content");
    if (contentEl) {
      observer.observe(contentEl, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [seadexEnabled]);

  // This component doesn't render anything directly
  // It manipulates the DOM to add SeaDex integration
  return null;
}
