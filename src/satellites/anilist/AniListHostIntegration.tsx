import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { err, log } from "@/lib/utils/logging";
import { AnimeBytesButton } from "./AnimeBytesButton";

/**
 * AniListHostIntegration component that implements declarative takeover for AniList site integration.
 * This component:
 * 1. Finds the sidebar element (anchor)
 * 2. Creates a container for the AnimeBytesButton
 * 3. Renders the button declaratively
 *
 * This replaces the imperative waitForElement and mountComponent approach.
 */
export function AniListHostIntegration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeHostIntegration = () => {
      if (isInitializedRef.current) {
        return;
      }

      // Find the sidebar element (our anchor)
      const sidebar = document.querySelector(".sidebar") as HTMLElement;

      if (!sidebar) {
        return;
      }

      try {
        // Create container for our button
        const container = document.createElement("div");
        // container.className = "ab-anilist-button-container";

        // Prepend to sidebar
        sidebar.insertBefore(container, sidebar.firstChild);

        // Store the container reference for rendering
        containerRef.current = container;

        // Use ref for immediate effect to prevent observer loop
        isInitializedRef.current = true;
        // Use state to trigger render effect
        setIsInitialized(true);

        log("AniList host integration initialized");
      } catch (error) {
        err("Failed to initialize AniList host integration", error);
      }
    };

    // Try to initialize immediately
    initializeHostIntegration();

    // Watch for dynamic content changes (in case sidebar loads later)
    const observer = new MutationObserver(() => {
      initializeHostIntegration();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Render the AnimeBytesButton when container is ready
  useEffect(() => {
    log("AniListHostIntegration render effect triggered", {
      containerRef: !!containerRef.current,
      isInitialized,
    });

    if (containerRef.current && isInitialized) {
      log("Rendering AnimeBytesButton", containerRef.current);
      render(<AnimeBytesButton />, containerRef.current);
    }
  }, [isInitialized]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
