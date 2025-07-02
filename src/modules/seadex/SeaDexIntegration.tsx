import { render } from "preact";
import { useEffect } from "preact/hooks";
import { apiService } from "@/services/api";
import { useSettingsStore } from "@/stores/settings";
import "@/styles/seadex.css";
import type { TorrentInfo } from "@/types";
import { SeaDexIcon } from "./SeaDexIcon";
import { SeaDexTab } from "./SeaDexTab";

const TORRENT_ID_REGEX = /&torrentid=(\d+)/i;

// Extend Window interface for AnimeBytes site functions
declare global {
  interface Window {
    switchTabs?: (element: HTMLAnchorElement) => void;
  }
}

export function SeaDexIntegration() {
  const { seadexEnabled } = useSettingsStore();

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
      // Process in batches of 100
      for (let i = 0; i < torrents.length; i += 100) {
        const batch = torrents.slice(i, i + 100);
        const linkMap = await apiService.fetchSeadex(batch);

        for (const { element: a, torrentId, separator } of batch) {
          const entry = linkMap[torrentId];
          if (!entry) continue;

          // Add SeaDx icon
          const iconContainer = document.createElement("span");
          a.parentNode?.appendChild(iconContainer);

          render(<SeaDexIcon entry={entry} separator={separator} />, iconContainer);

          // Add SeaDx tab if tabs exist
          const tabsList = document.querySelector(`#tabs_${torrentId}`);
          const tabsContainer = tabsList?.parentElement;

          if (!tabsList || !tabsContainer) continue;

          const tabId = `seadx_${torrentId}`;
          if (document.getElementById(tabId)) continue;

          // Create tab item
          const newTabItem = document.createElement("li");
          const newTabLink = document.createElement("a");
          newTabLink.href = `#${tabId}`;
          newTabLink.textContent = "SeaDx";
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

          // Add SeaDx classes to the original torrent row
          // This helps the row parser detect the SeaDx status
          const torrentRow = a.closest(".group_torrent") as HTMLElement;
          if (torrentRow) {
            if (entry.isBest) {
              torrentRow.classList.add("seadx-best");
            } else {
              torrentRow.classList.add("seadx-alt");
            }
          }
        }
      }

      // After processing SeaDx data, trigger a custom event to let TableRestructure know
      // it should re-process tables to pick up the new SeaDx classes
      const event = new CustomEvent("seadx-processing-complete", {
        detail: { processedTorrents: torrents.map((t) => t.torrentId) },
      });

      // Add a small delay to ensure all DOM modifications are complete
      setTimeout(() => {
        document.dispatchEvent(event);
      }, 100);
    } catch (error) {
      console.error("AB Suite (SeaDx): Failed to process torrents", error);
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

// Additional component for releases.moe site
export function ReleasesIntegration() {
  const { seadexEnabled } = useSettingsStore();

  useEffect(() => {
    if (!seadexEnabled) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          const element = node as Element;
          const elements = element.matches("a.pt-button, button.pt-button")
            ? [element]
            : Array.from(element.querySelectorAll("a.pt-button, button.pt-button"));

          elements.forEach((elm) => {
            const button = elm as HTMLAnchorElement;
            if (button.dataset.href) {
              button.href = new URL(button.dataset.href, "https://animebytes.tv").toString();
              button.classList.remove("pointer-events-none");
              button.removeAttribute("data-href");

              const img = button.querySelector("img");
              if (img) {
                img.src = "https://animebytes.tv/favicon.ico";
              }

              const textNode = Array.from(button.childNodes).find(
                (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
              ) as Text;

              if (textNode?.textContent?.includes("Private")) {
                textNode.textContent = " AnimeBytes";
              }
            }
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [seadexEnabled]);

  return null;
}
