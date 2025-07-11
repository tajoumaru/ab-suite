import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useDescriptionStore } from "@/stores/descriptions";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";
import { DescriptionRenderer } from "./DescriptionRenderer";

export function DescriptionIntegration() {
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

        descriptions.forEach((description) => {
          const descElement = description as HTMLElement;

          // Skip if already processed
          if (descElement.hasAttribute("data-ab-description-processed")) {
            return;
          }

          let torrentLink: HTMLAnchorElement | null = null;

          // Check if this is a gallery view description
          const galleryItem = descElement.closest(".ab-gallery-item");
          if (galleryItem) {
            // Skip gallery view descriptions - they're handled by the gallery component
            return;
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

            // Create a container for the reactive description
            const container = document.createElement("div");
            descElement.innerHTML = "";
            descElement.appendChild(container);

            // Render the reactive description
            render(<DescriptionRenderer torrentLink={torrentLink.href} />, container);
          }
        });

        if (!isInitialized.current) {
          isInitialized.current = true;
          log("AB Suite: Description integration initialized");
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
      // Only react to added nodes, not style or attribute changes
      const hasAddedNodes = mutations.some(
        (mutation) => mutation.type === "childList" && mutation.addedNodes.length > 0,
      );

      if (!hasAddedNodes) return;

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
  }, [readMoreEnabled, descriptionStore]);

  return null;
}
