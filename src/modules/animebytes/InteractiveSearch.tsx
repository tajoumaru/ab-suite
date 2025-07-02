import { useEffect } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";

// Default colors from the legacy userscript
const ANIME_MUSIC_ACTIVE_COLOR = "#0090ff";
const SUBCATEGORIES_ACTIVE_COLOR = "#fe2a73";

// Shared parameters between anime and music search
const ANIME_MUSIC_SHARED_PARAMS = ["year", "year2", "tags", "sort", "way", "showhidden", "freeleech"];

export function InteractiveSearch() {
  const { interactiveSearchEnabled } = useSettingsStore();

  useEffect(() => {
    // Early exit if feature is disabled or not on search pages
    if (!interactiveSearchEnabled) {
      return;
    }

    // Only run on search pages
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    // Helper function to extract category key from URL
    const categoryKeyFromLink = (link: string): string => {
      try {
        const url = new URL(link);
        for (const key of url.searchParams.keys()) {
          if (key.startsWith("filter_cat[")) {
            return key;
          }
        }
      } catch (error) {
        console.error("AB Suite: Error parsing URL in categoryKeyFromLink:", error);
      }
      return "";
    };

    // Get current category from URL
    const currentCategory = categoryKeyFromLink(window.location.href);
    const categoryNumber = currentCategory ? parseInt(currentCategory.slice(11, -1)) : 0;

    // Process category links in the sidebar
    const processCategoryLinks = () => {
      const categoryLinks = document.querySelectorAll("#categories > li > a");

      categoryLinks.forEach((link) => {
        const anchor = link as HTMLAnchorElement;
        const thisLinkCategory = categoryKeyFromLink(anchor.href);

        // Create URL without category filter
        const targetUrl = new URL(window.location.href);
        if (currentCategory) {
          targetUrl.searchParams.delete(currentCategory);
        }

        // If this is the current category, highlight it and make it remove the filter
        if (thisLinkCategory === currentCategory) {
          anchor.style.color = SUBCATEGORIES_ACTIVE_COLOR;
          anchor.href = targetUrl.toString();
          return;
        }

        // Add this category filter to the URL
        if (thisLinkCategory) {
          // Intentionally not editing search params to avoid encoding the "[]"
          if (targetUrl.search) {
            targetUrl.search += `&${thisLinkCategory}=1`;
          } else {
            targetUrl.search = `?${thisLinkCategory}=1`;
          }
          anchor.href = targetUrl.toString();
        }
      });
    };

    // Process anime/music navigation links
    const processNavigationLinks = () => {
      const animeLink = document.querySelector(
        '#browse_nav_sections > h2 > a[href="/torrents.php"]',
      ) as HTMLAnchorElement;
      const musicLink = document.querySelector(
        '#browse_nav_sections > h2 > a[href="/torrents2.php"]',
      ) as HTMLAnchorElement;

      if (!animeLink || !musicLink) {
        return; // Navigation not found
      }

      const isMusic = window.location.pathname.startsWith("/torrents2.php");
      const activeLink = isMusic ? musicLink : animeLink;
      const inactiveLink = isMusic ? animeLink : musicLink;

      // Highlight active link and disable it
      activeLink.style.color = ANIME_MUSIC_ACTIVE_COLOR;
      activeLink.style.cursor = "default";
      activeLink.href = "javascript:void(0);";

      // Process parameters for cross-navigation
      const params = new URL(window.location.href).searchParams;
      const newParams = new URLSearchParams();

      // Copy shared parameters
      for (const [key, value] of params.entries()) {
        if (ANIME_MUSIC_SHARED_PARAMS.includes(key)) {
          newParams.set(key, value);
        }
      }

      // Map search parameters between anime and music
      if (isMusic && params.get("groupname")) {
        newParams.set("searchstr", params.get("groupname") || "");
      } else if (!isMusic && params.get("searchstr")) {
        newParams.set("groupname", params.get("searchstr") || "");
      }

      // Set the inactive link's href with converted parameters
      const targetPath = isMusic ? "/torrents.php" : "/torrents2.php";
      const queryString = newParams.toString();
      inactiveLink.href = queryString ? `${targetPath}?${queryString}` : targetPath;
    };

    // Hide category-specific filters for filtered out categories
    const hideIrrelevantFilters = () => {
      const isMusic = window.location.pathname.startsWith("/torrents2.php");

      if (!isMusic && categoryNumber) {
        // Hide accordion sections that don't match the current category
        // The pattern is that category N corresponds to accordion section 2*N+1
        const accordionHeaders = document.querySelectorAll("#accordion > h3");

        accordionHeaders.forEach((header) => {
          const headerId = header.id;
          // Keep the first section (general filters) and the section for current category
          if (headerId && headerId !== "ui-id-1" && headerId !== `ui-id-${categoryNumber * 2 + 1}`) {
            (header as HTMLElement).style.display = "none";
          }
        });
      }
    };

    // Apply all modifications
    try {
      processCategoryLinks();
      processNavigationLinks();
      hideIrrelevantFilters();
    } catch (error) {
      console.error("AB Suite: Error in InteractiveSearch processing:", error);
    }

    // Set up observer for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      let shouldReprocess = false;

      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if new navigation or category elements were added
            if (
              element.matches("#categories, #browse_nav_sections, #accordion") ||
              element.querySelector("#categories, #browse_nav_sections, #accordion")
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
          try {
            processCategoryLinks();
            processNavigationLinks();
            hideIrrelevantFilters();
          } catch (error) {
            console.error("AB Suite: Error in InteractiveSearch reprocessing:", error);
          }
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [interactiveSearchEnabled]);

  // This component doesn't render anything directly
  return null;
}
