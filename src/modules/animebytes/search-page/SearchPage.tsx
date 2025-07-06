import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";
import { AutocompleteEnhancedInput } from "./AutocompleteEnhancedInput";
import { createCategoryUrl, createCrossNavigationUrl, useSearchState } from "./useSearchState";

interface SearchInputInfo {
  element: HTMLInputElement;
  type: "anime" | "music";
  container: HTMLElement;
}

// Default colors from the legacy userscript
const ANIME_MUSIC_ACTIVE_COLOR = "#0090ff";
const SUBCATEGORIES_ACTIVE_COLOR = "#fe2a73";

/**
 * SearchPage component that implements declarative takeover for search pages.
 * This component:
 * 1. Finds search input elements (anchors)
 * 2. Enhances them with autocomplete functionality by rendering enhanced inputs
 * 3. Enhances navigation and category links with interactive search features
 * 4. Replaces the imperative DOM manipulation from AutocompleteSearch and InteractiveSearch
 */
export function SearchPage() {
  const { autocompleteSearchEnabled, interactiveSearchEnabled } = useSettingsStore();
  const [searchInputs, setSearchInputs] = useState<SearchInputInfo[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const enhancedInputRefs = useRef<Map<HTMLInputElement, HTMLDivElement>>(new Map());
  const searchState = useSearchState();

  useEffect(() => {
    if (!autocompleteSearchEnabled) {
      return;
    }

    // Only run on search pages
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    const initializeSearchPage = () => {
      if (isInitialized) {
        return;
      }

      const inputs: SearchInputInfo[] = [];

      // Main search inputs for torrents pages - these match the original userscript exactly
      const animeSearch = document.querySelector('form[action$="/torrents.php"] > .series_search') as HTMLInputElement;
      const musicSearch = document.querySelector('form[action$="/torrents2.php"] > .series_search') as HTMLInputElement;
      const seriesSearch = document.querySelector('form[action$="/series.php"] > .series_search') as HTMLInputElement;

      // Advanced search inputs
      const animeSeriesInput = document.querySelector("#series_name_anime") as HTMLInputElement;
      const musicGroupInput = document.querySelector('.inputtext[name="groupname"]') as HTMLInputElement;

      // Process anime search input (if it exists)
      if (animeSearch?.parentElement) {
        inputs.push({
          element: animeSearch,
          type: "anime",
          container: animeSearch.parentElement,
        });
      }

      // Process music search input
      if (musicSearch?.parentElement) {
        inputs.push({
          element: musicSearch,
          type: "music",
          container: musicSearch.parentElement,
        });
      }

      // Process series search input
      if (seriesSearch?.parentElement) {
        inputs.push({
          element: seriesSearch,
          type: "anime",
          container: seriesSearch.parentElement,
        });
      }

      // Process anime series input (advanced search)
      if (animeSeriesInput?.parentElement) {
        inputs.push({
          element: animeSeriesInput,
          type: "anime",
          container: animeSeriesInput.parentElement,
        });
      }

      // Process music group input (advanced search)
      if (musicGroupInput?.parentElement) {
        inputs.push({
          element: musicGroupInput,
          type: "music",
          container: musicGroupInput.parentElement,
        });
      }

      if (inputs.length === 0) {
        return;
      }

      // Enhance each input with autocomplete
      inputs.forEach((inputInfo) => {
        const { element, container } = inputInfo;

        // Create container for enhanced input
        const enhancedContainer = document.createElement("div");
        enhancedContainer.className = "ab-enhanced-search-input";

        // Set up positioning
        enhancedContainer.style.display = "inline-block";

        // Insert the enhanced container
        container.insertBefore(enhancedContainer, element);

        // Move the original input inside our container (but keep it hidden for now)
        element.style.display = "none";
        enhancedContainer.appendChild(element);

        // Store reference for rendering
        enhancedInputRefs.current.set(element, enhancedContainer);
      });

      setSearchInputs(inputs);
      setIsInitialized(true);

      log("AB Suite: Search page initialized with", inputs.length, "enhanced inputs");
    };

    // Try to initialize immediately
    initializeSearchPage();

    // Watch for dynamic content changes
    const observer = new MutationObserver(() => {
      initializeSearchPage();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [autocompleteSearchEnabled, isInitialized]);

  // Render enhanced inputs when initialized
  useEffect(() => {
    if (!isInitialized || searchInputs.length === 0) {
      return;
    }

    searchInputs.forEach((inputInfo) => {
      const { element, type } = inputInfo;
      const container = enhancedInputRefs.current.get(element);

      if (container) {
        render(<AutocompleteEnhancedInput originalInput={element} searchType={type} />, container);
      }
    });

    log("AB Suite: Rendered", searchInputs.length, "enhanced search inputs");
  }, [isInitialized, searchInputs]);

  // Handle interactive search enhancements
  useEffect(() => {
    if (!interactiveSearchEnabled || !searchState.isSearchPage) {
      return;
    }

    const enhanceInteractiveSearch = () => {
      try {
        // Helper function to extract category key from link href
        const categoryKeyFromLink = (href: string): string => {
          try {
            const url = new URL(href);
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

        // Process category links in the sidebar
        const categoryLinks = document.querySelectorAll("#categories > li > a");
        categoryLinks.forEach((link) => {
          const anchor = link as HTMLAnchorElement;
          const thisLinkCategory = categoryKeyFromLink(anchor.href);

          // If this is the current category, highlight it and make it remove the filter
          if (thisLinkCategory === searchState.currentCategory) {
            anchor.style.color = SUBCATEGORIES_ACTIVE_COLOR;
            anchor.href = createCategoryUrl(searchState, ""); // Remove filter
          } else if (thisLinkCategory) {
            // Add this category filter to the URL
            anchor.href = createCategoryUrl(searchState, thisLinkCategory);
          }
        });

        // Process anime/music navigation links
        const animeLink = document.querySelector(
          '#browse_nav_sections > h2 > a[href="/torrents.php"]',
        ) as HTMLAnchorElement;
        const musicLink = document.querySelector(
          '#browse_nav_sections > h2 > a[href="/torrents2.php"]',
        ) as HTMLAnchorElement;

        if (animeLink && musicLink) {
          const activeLink = searchState.isMusicPage ? musicLink : animeLink;
          const inactiveLink = searchState.isMusicPage ? animeLink : musicLink;

          // Highlight active link and disable it
          activeLink.style.color = ANIME_MUSIC_ACTIVE_COLOR;
          activeLink.style.cursor = "default";
          activeLink.href = "javascript:void(0);";

          // Set the inactive link's href with converted parameters
          inactiveLink.href = createCrossNavigationUrl(searchState);
        }

        // Hide category-specific filters for filtered out categories
        if (!searchState.isMusicPage && searchState.categoryNumber) {
          // Hide accordion sections that don't match the current category
          // The pattern is that category N corresponds to accordion section 2*N+1
          const accordionHeaders = document.querySelectorAll("#accordion > h3");

          accordionHeaders.forEach((header) => {
            const headerId = header.id;
            // Keep the first section (general filters) and the section for current category
            if (headerId && headerId !== "ui-id-1" && headerId !== `ui-id-${searchState.categoryNumber * 2 + 1}`) {
              (header as HTMLElement).style.display = "none";
            }
          });
        }

        log("AB Suite: Interactive search enhancements applied");
      } catch (error) {
        console.error("AB Suite: Error in interactive search enhancement:", error);
      }
    };

    // Apply enhancements immediately
    enhanceInteractiveSearch();

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
          enhanceInteractiveSearch();
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
  }, [interactiveSearchEnabled, searchState]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
