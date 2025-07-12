import { useEffect } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { err, log } from "@/utils/logging";

export function YouTubeIntegration() {
  const settings = useSettingsStore(["youtubeOverlayHidingEnabled"]);

  useEffect(() => {
    if (!settings.youtubeOverlayHidingEnabled) {
      return;
    }

    const targetParentDomain = "https://animebytes.tv";

    // Check if we are inside an iframe
    if (window.top !== window.self) {
      try {
        const parentUrl = document.referrer;
        if (parentUrl.startsWith(targetParentDomain)) {
          log("YT Vid embedded on animebytes, hiding YouTube overlays.");

          // Hide the container for related videos and pause overlays
          GM_addStyle(
            `.ytp-pause-overlay-container,.ytp-endscreen-paginate {display: none !important;visibility: hidden !important;opacity: 0 !important;pointer-events: none !important}`,
          );
        } else {
          log("Embedded on a different site, not hiding YouTube overlays.");
        }
      } catch (e) {
        // This catch block will handle any potential cross-origin security errors,
        // though document.referrer is generally safe.
        err("Could not access parent URL:", e);
      }
    } else {
      log("Not in iframe, not hiding YouTube overlays.");
    }
  }, [settings.youtubeOverlayHidingEnabled]);

  // This component doesn't render anything visible
  return null;
}
