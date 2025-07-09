import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";
import { ReadMore } from "./ReadMore";

export function ReadMoreIntegration() {
  const { readMoreEnabled } = useSettingsStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!readMoreEnabled) {
      return;
    }

    const initializeReadMore = () => {
      try {
        // Find all torrent descriptions on the page
        const descriptions = document.querySelectorAll(".torrent_desc");

        if (descriptions.length === 0) {
          return;
        }

        log(`AB Suite: Found ${descriptions.length} torrent descriptions`);

        descriptions.forEach((description) => {
          const descElement = description as HTMLElement;

          // Skip if already processed
          if (descElement.querySelector(".ab-read-more-container")) {
            return;
          }

          // Check if description ends with "..." indicating truncation (trim to handle spaces)
          if (descElement.textContent?.trim().endsWith("...")) {
            // Find the torrent link - navigate up to find the group image link
            const torrentLink = descElement.parentElement?.parentElement?.querySelector(
              ".group_img > span > a",
            ) as HTMLAnchorElement;

            if (torrentLink) {
              // Create a container for the ReadMore component
              const container = document.createElement("span");
              container.className = "ab-read-more-container";

              // Add a space before the link
              descElement.appendChild(document.createTextNode(" "));
              descElement.appendChild(container);

              // Render the ReadMore component
              render(<ReadMore description={descElement} torrentLink={torrentLink.href} />, container);
            }
          }
        });

        if (!isInitialized.current) {
          isInitialized.current = true;
          log("AB Suite: ReadMore integration initialized");
        }
      } catch (error) {
        console.error("AB Suite: Failed to initialize ReadMore", error);
      }
    };

    // Initialize immediately
    initializeReadMore();

    // Watch for dynamic content changes
    const observer = new MutationObserver(() => {
      initializeReadMore();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      isInitialized.current = false;
    };
  }, [readMoreEnabled]);

  return null;
}
