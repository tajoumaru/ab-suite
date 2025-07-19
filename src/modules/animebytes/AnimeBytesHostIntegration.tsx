import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { err, log } from "@/utils/logging";
import { AniListMetadataIntegration } from "./AniListMetadataIntegration";
import { BbcodeToolbarIntegration } from "./BbcodeToolbarIntegration";
import { EnhancedTagStyling } from "./EnhancedTagStyling";
import { LogoReplacement } from "./LogoReplacement";
import { QuickNavigation } from "./QuickNavigation";
import { SeriesTitles } from "./SeriesTitles";
import { SettingsButton } from "./SettingsModal";
import { UnifiedDescriptionIntegration } from "./UnifiedDescriptionIntegration";

/**
 * AnimeBytesHostIntegration component that implements declarative takeover for animebytes site integration.
 * This component:
 * 1. Finds the userinfo_minor element (anchor)
 * 2. Creates a container for the SettingsButton
 * 3. Renders the settings button declaratively
 *
 * This replaces the imperative waitForElement and mountComponent approach.
 */
export function AnimeBytesHostIntegration() {
  const containerRef = useRef<HTMLLIElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const initializeHostIntegration = () => {
      if (isInitialized.current) {
        return;
      }

      // Find the userinfo_minor element (our anchor)
      const userInfoMinor = document.querySelector("#userinfo_minor") as HTMLUListElement;

      if (!userInfoMinor) {
        return;
      }

      try {
        // Create container for our settings button (as a list item)
        const container = document.createElement("li");
        container.className = "ab-settings-button-container";

        // Prepend to userinfo_minor
        userInfoMinor.insertBefore(container, userInfoMinor.firstChild);

        // Store the container reference for rendering
        containerRef.current = container;

        isInitialized.current = true;

        log("animebytes host integration initialized");
      } catch (error) {
        err("Failed to initialize animebytes host integration", error);
      }
    };

    // Try to initialize immediately
    initializeHostIntegration();

    // Watch for dynamic content changes (in case userinfo loads later)
    const observer = new MutationObserver(() => {
      initializeHostIntegration();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Render the SettingsButton when container is ready
  useEffect(() => {
    if (containerRef.current && isInitialized.current) {
      render(<SettingsButton />, containerRef.current);
    }
  }, [isInitialized.current]);

  // This component doesn't render anything directly - it manages DOM takeover
  // Also render the integrations for descriptions, enhanced tag styling, and AniList metadata
  return (
    <>
      <UnifiedDescriptionIntegration />
      <EnhancedTagStyling />
      <AniListMetadataIntegration />
      <QuickNavigation />
      <LogoReplacement />
      <BbcodeToolbarIntegration />
      <SeriesTitles />
    </>
  );
}
