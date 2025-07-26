import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useDescriptionStore } from "@/core/shared/descriptions";
import { useSettingsStore } from "@/lib/state/settings";
import { err, log } from "@/lib/utils/logging";
import { ReadMore } from "./ReadMore";

export function ReadMoreIntegration() {
  const { readMoreEnabled } = useSettingsStore(["readMoreEnabled"]);
  const descriptionStore = useDescriptionStore();
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

        log(`Found ${descriptions.length} torrent descriptions`);

        // Batch DOM operations for ReadMore containers
        const elementsToProcess: Array<{
          descElement: HTMLElement;
          torrentLink: HTMLAnchorElement;
        }> = [];

        // First pass: identify elements that need processing
        descriptions.forEach((description) => {
          const descElement = description as HTMLElement;

          // Skip if already processed
          if (descElement.querySelector(".ab-read-more-container")) {
            return;
          }

          // Check if description ends with "..." indicating truncation (trim to handle spaces)
          if (descElement.textContent?.trim().endsWith("...")) {
            let torrentLink: HTMLAnchorElement | null = null;

            // Check if this is a gallery view description
            const galleryItem = descElement.closest(".ab-gallery-item");
            if (galleryItem) {
              // In gallery view, the torrent link is the main clickable area
              torrentLink = galleryItem.querySelector(".ab-gallery-item-clickable-area") as HTMLAnchorElement;
            } else {
              // Regular view - navigate up to find the group image link
              torrentLink = descElement.parentElement?.parentElement?.querySelector(
                ".group_img > span > a",
              ) as HTMLAnchorElement;
            }

            if (torrentLink) {
              // Initialize description state
              descriptionStore.initializeDescription(torrentLink.href, descElement.innerHTML);
              elementsToProcess.push({ descElement, torrentLink });
            }
          }
        });

        // Second pass: batch create all containers using DocumentFragment
        if (elementsToProcess.length > 0) {
          elementsToProcess.forEach(({ descElement, torrentLink }) => {
            // Create a container for the ReadMore component
            const container = document.createElement("span");
            // container.className = "ab-read-more-container";

            // Create space text node
            const spaceNode = document.createTextNode(" ");

            // Batch these operations by appending to fragment first, then to the actual DOM
            const tempFragment = document.createDocumentFragment();
            tempFragment.appendChild(spaceNode);
            tempFragment.appendChild(container);

            // Append the fragment to the description element (single DOM operation)
            descElement.appendChild(tempFragment);

            // Render the ReadMore component
            render(<ReadMore torrentLink={torrentLink.href} />, container);
          });
        }

        if (!isInitialized.current) {
          isInitialized.current = true;
          log("ReadMore integration initialized");
        }
      } catch (error) {
        err("Failed to initialize ReadMore", error);
      }
    };

    // Initialize immediately
    initializeReadMore();

    // Watch for dynamic content changes with debouncing
    let timeoutId: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver((mutations) => {
      // Only react to added nodes, not style or attribute changes
      const hasAddedNodes = mutations.some(
        (mutation) => mutation.type === "childList" && mutation.addedNodes.length > 0,
      );

      if (!hasAddedNodes) return;

      // Debounce to avoid rapid successive calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        initializeReadMore();
      }, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    // Listen for gallery view changes
    const handleGalleryViewChange = () => {
      // Re-initialize when gallery view is toggled
      // Reset the initialized flag to allow re-processing of descriptions
      isInitialized.current = false;
      setTimeout(() => {
        initializeReadMore();
      }, 100);
    };

    document.addEventListener("ab-gallery-view-changed", handleGalleryViewChange);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
      document.removeEventListener("ab-gallery-view-changed", handleGalleryViewChange);
      isInitialized.current = false;
    };
  }, [readMoreEnabled]);

  return null;
}
