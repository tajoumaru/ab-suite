import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useDescriptionStore } from "@/stores/descriptions";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";
import { DescriptionRenderer } from "./DescriptionRenderer";
import { ReadMore } from "./ReadMore";

export function UnifiedDescriptionIntegration() {
  const { readMoreEnabled } = useSettingsStore(["readMoreEnabled"]);
  const descriptionStore = useDescriptionStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!readMoreEnabled) {
      return;
    }

    const initializeDescriptions = () => {
      try {
        // Find all torrent descriptions on the page
        const descriptions = document.querySelectorAll(".torrent_desc");

        if (descriptions.length === 0) {
          return;
        }

        log(`AB Suite: Found ${descriptions.length} torrent descriptions`);

        let processedCount = 0;
        let readMoreCount = 0;

        descriptions.forEach((description) => {
          const descElement = description as HTMLElement;

          // Skip if already processed by either integration
          if (descElement.hasAttribute("data-ab-description-processed")) {
            return;
          }

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

            // Mark as processed
            descElement.setAttribute("data-ab-description-processed", "true");
            processedCount++;

            if (galleryItem) {
              // Gallery view: Only add ReadMore if needed, don't replace the description content
              // The DescriptionRenderer is handled by the gallery component itself
              if (descriptionStore.needsReadMore(torrentLink.href)) {
                // Create a container for the ReadMore component
                const readMoreContainer = document.createElement("span");
                readMoreContainer.className = "ab-read-more-container";

                // Create space text node
                const spaceNode = document.createTextNode(" ");

                // Append to the description element
                descElement.appendChild(spaceNode);
                descElement.appendChild(readMoreContainer);

                // Render the ReadMore component
                render(<ReadMore torrentLink={torrentLink.href} />, readMoreContainer);
                readMoreCount++;
              }
            } else {
              // Regular view: Replace the description content with reactive renderer
              // Create a container for the reactive description
              const container = document.createElement("div");
              descElement.innerHTML = "";
              descElement.appendChild(container);

              // Render the reactive description
              render(<DescriptionRenderer torrentLink={torrentLink.href} />, container);

              // Check if description needs ReadMore functionality
              if (descriptionStore.needsReadMore(torrentLink.href)) {
                // Create a container for the ReadMore component
                const readMoreContainer = document.createElement("span");
                readMoreContainer.className = "ab-read-more-container";

                // Create space text node
                const spaceNode = document.createTextNode(" ");

                // Append to the description element
                descElement.appendChild(spaceNode);
                descElement.appendChild(readMoreContainer);

                // Render the ReadMore component
                render(<ReadMore torrentLink={torrentLink.href} />, readMoreContainer);
                readMoreCount++;
              }
            }
          }
        });

        if (!isInitialized.current && processedCount > 0) {
          isInitialized.current = true;
          log(
            `AB Suite: Unified description integration initialized - processed ${processedCount} descriptions, ${readMoreCount} with ReadMore`,
          );
        }
      } catch (error) {
        console.error("AB Suite: Failed to initialize descriptions", error);
      }
    };

    // Initialize immediately
    initializeDescriptions();

    // Watch for dynamic content changes with debouncing
    let timeoutId: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver((mutations) => {
      // Only react to meaningful added nodes that could contain new descriptions
      const hasRelevantAddedNodes = mutations.some((mutation) => {
        if (mutation.type !== "childList" || mutation.addedNodes.length === 0) {
          return false;
        }

        // Check if any added nodes contain new torrent descriptions or are new torrent groups
        return Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;

          const element = node as Element;

          // Ignore changes inside already-processed descriptions (ReadMore functionality)
          if (element.closest(".torrent_desc[data-ab-description-processed]")) {
            return false;
          }

          // Check if the node contains unprocessed torrent descriptions or is a torrent group
          return (
            element.matches?.(".torrent_desc:not([data-ab-description-processed])") ||
            element.querySelector?.(".torrent_desc:not([data-ab-description-processed])") ||
            element.matches?.(".group_cont.box, .ab-gallery-item") ||
            element.querySelector?.(".group_cont.box, .ab-gallery-item")
          );
        });
      });

      if (!hasRelevantAddedNodes) return;

      // Debounce to avoid rapid successive calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        initializeDescriptions();
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
      isInitialized.current = false;
      setTimeout(() => {
        initializeDescriptions();
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
