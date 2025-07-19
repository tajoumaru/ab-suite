import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { AniListMediaData } from "@/services/anilist";
import { log } from "@/utils/logging";

// Global integration tracking to prevent double integration
let globalSynopsisIntegrated = false;

interface EnhancedSynopsisProps {
  aniListData: AniListMediaData;
  originalContent?: string;
}

/**
 * Clean up AniList HTML description to match expected format
 */
function cleanAniListDescription(html: string): string {
  if (!html) return html;

  return (
    html
      // Replace <br><br /> with <br>
      .replace(/<br><br\s*\/?>(\s*\n)*/gi, "<br>")
      // Replace multiple consecutive <br> tags with double <br>
      .replace(/(<br>\s*){3,}/gi, "<br><br>")
      // Clean up any trailing line breaks and whitespace
      .replace(/(<br>\s*)+$/gi, "")
      .trim()
  );
}

/**
 * Enhanced synopsis component that replaces the original plot synopsis
 * with AniList data while maintaining the original styling
 */
export function EnhancedSynopsis({ aniListData, originalContent }: EnhancedSynopsisProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  // Choose content based on toggle state and clean AniList description
  const description = showOriginal
    ? originalContent || ""
    : aniListData.description
      ? cleanAniListDescription(aniListData.description)
      : originalContent || "";

  log("EnhancedSynopsis render:", {
    hasAniListDescription: !!aniListData.description,
    aniListDescriptionLength: aniListData.description?.length || 0,
    hasOriginalContent: !!originalContent,
    originalContentLength: originalContent?.length || 0,
    showOriginal,
    selectedContent: showOriginal ? "original" : "anilist",
    finalDescriptionLength: description.length,
  });

  const toggleContent = () => {
    log("Synopsis toggle clicked, current showOriginal:", showOriginal);
    setShowOriginal(!showOriginal);
    log("Synopsis toggle new state will be:", !showOriginal);
  };

  return (
    <div className="box ab-enhanced-synopsis" data-ab-section="synopsis">
      <div className="head ab-synopsis-header">
        <strong>Plot Synopsis</strong>
        {originalContent && aniListData.description && (
          <span className="ab-synopsis-toggle">
            <button type="button" onClick={toggleContent} className="ab-toggle-button">
              {showOriginal ? "Show AniList" : "Show Original"}
            </button>
          </span>
        )}
      </div>
      <div className="body ab-synopsis-body">
        <div
          className="ab-synopsis-content"
          data-source={showOriginal ? "original" : "anilist"}
          dangerouslySetInnerHTML={{
            __html: description,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Hook to manage enhanced synopsis integration
 */
export function useEnhancedSynopsis(aniListData: AniListMediaData | null) {
  const [isIntegrated, setIsIntegrated] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  // Memoize the title and description to prevent unnecessary re-runs
  const memoizedData = useMemo(() => {
    if (!aniListData) return null;
    return {
      title: aniListData.title?.romaji,
      hasDescription: !!aniListData.description,
      description: aniListData.description,
    };
  }, [aniListData?.title?.romaji, aniListData?.description]);

  // Only log when actually relevant data changes
  useEffect(() => {
    if (memoizedData) {
      log("useEnhancedSynopsis called:", {
        hasAniListData: true,
        isIntegrated,
        title: memoizedData.title,
      });
    }
  }, [memoizedData, isIntegrated]);

  useEffect(() => {
    if (!memoizedData) {
      return;
    }

    if (isIntegrated || globalSynopsisIntegrated) {
      log("useEnhancedSynopsis: Already integrated, skipping");
      return;
    }

    log("useEnhancedSynopsis: Starting integration with data:", {
      title: memoizedData.title,
      hasDescription: memoizedData.hasDescription,
      descriptionPreview: memoizedData.description ? `${memoizedData.description.substring(0, 100)}...` : "",
    });

    const integrateSynopsis = () => {
      log("integrateSynopsis called, isIntegrated:", isIntegrated, "globalIntegrated:", globalSynopsisIntegrated);

      // If already integrated globally, skip
      if (globalSynopsisIntegrated) {
        log("Synopsis already integrated globally, skipping");
        return;
      }

      // If already integrated locally, skip
      if (isIntegrated) {
        log("Synopsis already integrated locally, skipping");
        return;
      }

      // Look for synopsis boxes in both modern and classic layouts
      const synopsisSelectors = [
        "#ab-sections-container .box:not([data-ab-enhanced-synopsis])",
        ".box:not([data-ab-enhanced-synopsis])",
      ];

      let synopsisElement: HTMLElement | null = null;

      for (const selector of synopsisSelectors) {
        const elements = document.querySelectorAll(selector);
        log("Searching with selector:", selector, "found:", elements.length);

        for (const element of elements) {
          const header = element.querySelector(".head strong")?.textContent;
          log("Checking element with header:", header);

          if (header?.includes("Plot Synopsis")) {
            synopsisElement = element as HTMLElement;
            log("Found Plot Synopsis element with selector:", selector);
            break;
          }
        }

        if (synopsisElement) break;
      }

      if (!synopsisElement) {
        log(
          "No synopsis element found, available boxes:",
          Array.from(document.querySelectorAll(".box")).map((box) => {
            const header = box.querySelector(".head strong")?.textContent;
            return { header, hasEnhancedAttribute: box.hasAttribute("data-ab-enhanced-synopsis") };
          }),
        );
        return;
      }

      log("Found synopsis element, proceeding with integration");

      // Extract original content
      const bodyElement = synopsisElement.querySelector(".body") as HTMLElement;
      const originalContent = bodyElement ? bodyElement.innerHTML : "";

      log("Extracting original synopsis content:", {
        hasBodyElement: !!bodyElement,
        originalContentLength: originalContent.length,
        originalContentPreview: `${originalContent.substring(0, 100)}...`,
      });

      // Mark as processed BEFORE making changes
      synopsisElement.setAttribute("data-ab-enhanced-synopsis", "true");

      // Disconnect observer before DOM manipulation
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Replace the entire synopsis content with our enhanced version
      const container = document.createElement("div");
      const parent = synopsisElement.parentNode;

      log("Replacing synopsis element:", {
        hasParent: !!parent,
        containerCreated: !!container,
      });

      if (parent) {
        parent.replaceChild(container, synopsisElement);
        log("Synopsis element replaced with container");
      }

      // Render the enhanced synopsis
      import("preact").then(({ render }) => {
        log("Rendering enhanced synopsis with:", {
          hasAniListData: !!aniListData,
          hasOriginalContent: !!originalContent,
          containerElement: container.tagName,
        });
        if (aniListData) {
          render(<EnhancedSynopsis aniListData={aniListData} originalContent={originalContent} />, container);
        }
        log("Enhanced synopsis rendered successfully");
      });

      setIsIntegrated(true);
      globalSynopsisIntegrated = true;
      log("Enhanced synopsis integrated successfully");
    };

    // Try to integrate immediately
    integrateSynopsis();

    // Only set up observer if not integrated
    if (!isIntegrated) {
      // Watch for dynamic content changes
      const observer = new MutationObserver((mutations) => {
        // Check if any mutations added a synopsis box
        const hasNewSynopsis = mutations.some((mutation) => {
          return Array.from(mutation.addedNodes).some((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const element = node as Element;
            return (
              element.querySelector?.(".box .head strong")?.textContent?.includes("Plot Synopsis") ||
              (element.classList?.contains("box") &&
                element.querySelector(".head strong")?.textContent?.includes("Plot Synopsis")) ||
              // Also check for ab-sections-container updates
              element.id === "ab-sections-container"
            );
          });
        });

        if (hasNewSynopsis) {
          integrateSynopsis();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [memoizedData, isIntegrated, aniListData]);

  return isIntegrated;
}
