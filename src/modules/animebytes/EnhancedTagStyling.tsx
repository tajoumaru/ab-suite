import { render } from "preact";
import { useEffect } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";
import { applyTagStyling } from "@/utils/tags";
import { TagCloud } from "./TagCloud";

export function EnhancedTagStyling() {
  const { enhancedTagStylingEnabled } = useSettingsStore(["enhancedTagStylingEnabled"]);

  useEffect(() => {
    if (!enhancedTagStylingEnabled) {
      // Reset all tag styling
      applyTagStyling(".tags a", false);
      applyTagStyling("#browse_nav_tags a", false);
      applyTagStyling(".tag_name", false);
      applyTagStyling(".stats.nobullet li a", false);

      // Remove TagCloud and show original
      const tagCloudContainer = document.querySelector(".ab-tag-cloud-container");
      if (tagCloudContainer) {
        tagCloudContainer.remove();
      }
      const originalTagCloud = document.getElementById("browse_nav_tags");
      if (originalTagCloud) {
        originalTagCloud.style.display = "";
      }
      return;
    }

    log("Enhanced Tag Styling: Applying tag transformations");

    // Apply initial styling
    applyTagStyles();

    // Initialize TagCloud replacement
    initializeTagCloud();

    // Set up observer for dynamic content with debouncing
    let timeoutId: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver((mutations) => {
      // Only react to meaningful added nodes, not our own modifications
      const hasRelevantAddedNodes = mutations.some((mutation) => {
        if (mutation.type !== "childList" || mutation.addedNodes.length === 0) {
          return false;
        }

        // Check if any added nodes contain tag elements or are tag elements themselves
        return Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;

          const element = node as Element;
          // Check if the node itself is a tag element or contains tag elements
          return (
            element.matches?.("a[href*='torrents.php?tags='], .tag_name") ||
            element.querySelector?.("a[href*='torrents.php?tags='], .tag_name") ||
            element.matches?.(".tags, #browse_nav_tags, .stats.nobullet") ||
            element.querySelector?.(".tags, #browse_nav_tags, .stats.nobullet")
          );
        });
      });

      if (!hasRelevantAddedNodes) return;

      // Debounce to avoid rapid successive calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        applyTagStyles();
        initializeTagCloud();
      }, 200);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      // Only watch for DOM structure changes, not attribute changes
      attributes: false,
      characterData: false,
    });

    function applyTagStyles() {
      // 1. Standard torrent view tags
      applyTagStyling(".tags a", true);

      // 2. Tag cloud is now handled by TagCloud component
      // applyTagStyling("#browse_nav_tags a", true);

      // 3. Torrent/series page tags with voting
      applyTagStyling(".tag_name", true);

      // 4. Simple tag lists on torrent pages
      applyTagStyling(".stats.nobullet li a[href*='/torrents.php?tags=']", true);
    }

    function initializeTagCloud() {
      const originalTagCloud = document.getElementById("browse_nav_tags");
      if (!originalTagCloud) return;

      // Check if we've already replaced it
      if (document.querySelector(".ab-tag-cloud-container")) return;

      // Create container for our TagCloud component
      const container = document.createElement("div");
      container.className = "ab-tag-cloud-container";

      // Insert after the original tag cloud
      originalTagCloud.parentNode?.insertBefore(container, originalTagCloud.nextSibling);

      // Render our TagCloud component
      render(<TagCloud />, container);
    }

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [enhancedTagStylingEnabled]);

  return null;
}
