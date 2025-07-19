import { useEffect, useRef } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";

export function SeriesTitles() {
  const settingsStore = useSettingsStore(["seriesTitlesEnabled"]);
  const isInitialized = useRef(false);
  const processedElements = useRef(new Set<Element>());

  useEffect(() => {
    // Only run on /airing subpage
    if (!window.location.pathname.includes("/airing")) {
      return;
    }

    if (!settingsStore.seriesTitlesEnabled) {
      return;
    }

    const insertTitles = () => {
      if (isInitialized.current) {
        return;
      }

      // Find all td > a elements that contain images (series entries)
      const seriesLinks = document.querySelectorAll("td > a");
      let titlesAdded = 0;

      for (const link of seriesLinks) {
        // Skip if already processed
        if (processedElements.current.has(link)) {
          continue;
        }

        // Check if this link contains an image (indicating a series entry)
        const img = link.querySelector("img");
        if (!img || !img.title) {
          continue;
        }

        // Create the series title element
        const seriesTitleBox = document.createElement("div");
        seriesTitleBox.innerText = img.title;
        seriesTitleBox.className = "nym_series_title";

        // Append to the link
        link.appendChild(seriesTitleBox);

        // Mark as processed
        processedElements.current.add(link);
        titlesAdded++;
      }

      if (titlesAdded > 0) {
        isInitialized.current = true;
        log(`Series titles: Added titles to ${titlesAdded} series entries`);
      }
    };

    // Try to insert titles immediately
    insertTitles();

    // Watch for dynamic content changes
    const observer = new MutationObserver(() => {
      insertTitles();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [settingsStore.seriesTitlesEnabled]);

  // This component doesn't render anything - it only adds titles to existing DOM elements
  return null;
}
