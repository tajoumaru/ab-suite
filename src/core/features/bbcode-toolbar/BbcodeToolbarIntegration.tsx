import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { log } from "@/lib/utils/logging";
import { useSettingsStore } from "@/lib/state/settings";
import { EnhancedBbcodeToolbar } from "./EnhancedBbcodeToolbar";

export function BbcodeToolbarIntegration() {
  const settingsStore = useSettingsStore();
  const isInitialized = useRef(false);
  const originalToolbar = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const initializeToolbarIntegration = () => {
      if (isInitialized.current) {
        return;
      }

      // Find the original bbcode toolbar
      const bbcodeToolbar = document.querySelector("#bbcode") as HTMLElement;

      if (!bbcodeToolbar) {
        return;
      }

      try {
        // Store reference to original toolbar
        originalToolbar.current = bbcodeToolbar;

        // Create container for enhanced toolbar
        const container = document.createElement("div");
        container.className = "ab-enhanced-bbcode-container";

        // Insert the enhanced toolbar container after the original
        bbcodeToolbar.parentNode?.insertBefore(container, bbcodeToolbar.nextSibling);
        containerRef.current = container;

        isInitialized.current = true;
        log("BBCode toolbar integration initialized");
      } catch (error) {
        console.error("Failed to initialize BBCode toolbar integration:", error);
      }
    };

    // Try to initialize immediately
    initializeToolbarIntegration();

    // Watch for dynamic content changes
    const observer = new MutationObserver(() => {
      initializeToolbarIntegration();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle toolbar visibility based on settings
  useEffect(() => {
    if (!isInitialized.current || !originalToolbar.current || !containerRef.current) {
      return;
    }

    if (settingsStore.enhancedBbcodeToolbarEnabled) {
      // Hide original toolbar and show enhanced one
      originalToolbar.current.style.display = "none";
      containerRef.current.style.display = "block";

      // Render enhanced toolbar
      render(<EnhancedBbcodeToolbar />, containerRef.current);
    } else {
      // Show original toolbar and hide enhanced one
      originalToolbar.current.style.display = "";
      containerRef.current.style.display = "none";
    }
  }, [settingsStore.enhancedBbcodeToolbarEnabled, isInitialized.current]);

  return null;
}
