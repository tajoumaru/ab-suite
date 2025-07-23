import { useEffect, useState } from "preact/hooks";

// Shared parameters between anime and music search
const ANIME_MUSIC_SHARED_PARAMS = ["year", "year2", "tags", "sort", "way", "showhidden", "freeleech"];

export interface SearchPageState {
  isSearchPage: boolean;
  isMusicPage: boolean;
  currentCategory: string;
  categoryNumber: number;
  searchParams: URLSearchParams;
  currentPath: string;
}

/**
 * Custom hook to extract search page state information.
 * This replaces the imperative state detection from InteractiveSearch component.
 */
export function useSearchState(): SearchPageState {
  const [searchState, setSearchState] = useState<SearchPageState>(() => {
    return extractSearchState();
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setSearchState(extractSearchState());
    };

    // Listen for navigation changes
    window.addEventListener("popstate", handleLocationChange);

    // Also update on initial load or when URL changes
    const observer = new MutationObserver(() => {
      const newState = extractSearchState();
      if (newState.currentPath !== searchState.currentPath) {
        setSearchState(newState);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      observer.disconnect();
    };
  }, [searchState.currentPath]);

  return searchState;
}

function extractSearchState(): SearchPageState {
  const currentPath = window.location.pathname;
  const isSearchPage = currentPath.includes("/torrents.php") || currentPath.includes("/torrents2.php");
  const isMusicPage = currentPath.startsWith("/torrents2.php");
  const searchParams = new URLSearchParams(window.location.search);

  // Helper function to extract category key from URL
  const categoryKeyFromUrl = (): string => {
    for (const key of searchParams.keys()) {
      if (key.startsWith("filter_cat[")) {
        return key;
      }
    }
    return "";
  };

  const currentCategory = categoryKeyFromUrl();
  const categoryNumber = currentCategory ? parseInt(currentCategory.slice(11, -1)) : 0;

  return {
    isSearchPage,
    isMusicPage,
    currentCategory,
    categoryNumber,
    searchParams,
    currentPath,
  };
}

/**
 * Helper function to create cross-navigation URL between anime and music pages
 */
export function createCrossNavigationUrl(searchState: SearchPageState): string {
  const { isMusicPage, searchParams } = searchState;
  const newParams = new URLSearchParams();

  // Copy shared parameters
  for (const [key, value] of searchParams.entries()) {
    if (ANIME_MUSIC_SHARED_PARAMS.includes(key)) {
      newParams.set(key, value);
    }
  }

  // Map search parameters between anime and music
  if (isMusicPage && searchParams.get("groupname")) {
    newParams.set("searchstr", searchParams.get("groupname") || "");
  } else if (!isMusicPage && searchParams.get("searchstr")) {
    newParams.set("groupname", searchParams.get("searchstr") || "");
  }

  // Create target URL
  const targetPath = isMusicPage ? "/torrents.php" : "/torrents2.php";
  const queryString = newParams.toString();
  return queryString ? `${targetPath}?${queryString}` : targetPath;
}

/**
 * Helper function to create category filter URL
 */
export function createCategoryUrl(searchState: SearchPageState, categoryKey: string): string {
  const targetUrl = new URL(window.location.href);

  // Remove current category filter
  if (searchState.currentCategory) {
    targetUrl.searchParams.delete(searchState.currentCategory);
  }

  // Add new category filter if different from current
  if (categoryKey && categoryKey !== searchState.currentCategory) {
    // Intentionally not using searchParams.set to avoid encoding the "[]"
    if (targetUrl.search) {
      targetUrl.search += `&${categoryKey}=1`;
    } else {
      targetUrl.search = `?${categoryKey}=1`;
    }
  }

  return targetUrl.toString();
}
