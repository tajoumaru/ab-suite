import { useEffect, useState } from "preact/hooks";
import { log } from "@/utils/logging";

interface NavigationState {
  currentPath: string;
  currentUrl: string;
  isAnimePage: boolean;
  isMangaPage: boolean;
  mediaId: string | null;
}

export function useNavigation(): NavigationState {
  const [state, setState] = useState<NavigationState>(() => {
    const path = window.location.pathname;
    const url = window.location.href;

    return {
      currentPath: path,
      currentUrl: url,
      isAnimePage: path.startsWith("/anime/"),
      isMangaPage: path.startsWith("/manga/"),
      mediaId: extractMediaId(path),
    };
  });

  useEffect(() => {
    const updateState = () => {
      const path = window.location.pathname;
      const url = window.location.href;

      setState({
        currentPath: path,
        currentUrl: url,
        isAnimePage: path.startsWith("/anime/"),
        isMangaPage: path.startsWith("/manga/"),
        mediaId: extractMediaId(path),
      });
    };

    // Handle SPA navigation (pushState/replaceState)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      updateState();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      updateState();
    };

    // Handle browser back/forward
    const handlePopState = () => {
      updateState();
    };

    window.addEventListener("popstate", handlePopState);

    // Cleanup
    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return state;
}

function extractMediaId(path: string): string | null {
  const match = path.match(/\/(anime|manga)\/(\d+)/);
  return match ? match[2] : null;
}

/**
 * Hook for detecting when we're on a valid media page with required data
 */
export function useMediaPageReady(): boolean {
  const [isReady, setIsReady] = useState(false);
  const { isAnimePage, isMangaPage } = useNavigation();

  useEffect(() => {
    log("useMediaPageReady effect", { isAnimePage, isMangaPage });

    if (!isAnimePage && !isMangaPage) {
      log("Not on anime/manga page, setting ready to false");
      setIsReady(false);
      return;
    }

    const checkReady = () => {
      // Check if the required DOM elements are present
      const sidebar = document.querySelector(".sidebar");
      const formatElement = Array.from(document.querySelectorAll(".sidebar > .data .type")).find(
        (el) => el.textContent?.trim() === "Format",
      );

      const ready = !!(sidebar && formatElement);
      log("checkReady", {
        sidebar: !!sidebar,
        formatElement: !!formatElement,
        ready,
        sidebarElements: document.querySelectorAll(".sidebar").length,
        dataTypeElements: document.querySelectorAll(".sidebar > .data .type").length,
      });

      setIsReady(ready);
    };

    // Initial check
    checkReady();

    // Watch for DOM changes
    const observer = new MutationObserver(checkReady);
    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      observer.disconnect();
    }, 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [isAnimePage, isMangaPage]);

  log("useMediaPageReady returning", isReady);
  return isReady;
}
