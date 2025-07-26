import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { AniListMediaData } from "@/services/anilist";

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

  const toggleContent = () => {
    setShowOriginal(!showOriginal);
  };

  return (
    <div mb="20px" className="box" data-ab-section="synopsis">
      <div justify="between" items="center" flex="~ wrap" gap="10px" className="head">
        <strong>Plot Synopsis</strong>
        {originalContent && aniListData.description && (
          <span flex items="center">
            <button
              type="button"
              onClick={toggleContent}
              bg="[none]"
              border="1 solid #ccc"
              text="white 11px"
              p="[2px_8px]"
              cursor="pointer"
              rounded="3px"
              transition="all"
              hover="bg-[rgba(255,255,255,0.1)] border-white"
            >
              {showOriginal ? "Show AniList" : "Show Original"}
            </button>
          </span>
        )}
      </div>
      <div className="body">
        <div
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

  useEffect(() => {
    if (!memoizedData) {
      return;
    }

    if (isIntegrated || globalSynopsisIntegrated) {
      return;
    }

    const integrateSynopsis = () => {
      // If already integrated globally, skip
      if (globalSynopsisIntegrated) {
        return;
      }

      // If already integrated locally, skip
      if (isIntegrated) {
        return;
      }

      // Look for synopsis boxes only in the sections container where they should be rendered
      const synopsisSelectors = ["#ab-sections-container .box:not([data-ab-enhanced-synopsis])"];

      let synopsisElement: HTMLElement | null = null;

      for (const selector of synopsisSelectors) {
        const elements = document.querySelectorAll(selector);

        for (const element of elements) {
          const header = element.querySelector(".head strong")?.textContent;

          if (header?.includes("Plot Synopsis")) {
            synopsisElement = element as HTMLElement;
            break;
          }
        }

        if (synopsisElement) break;
      }

      if (!synopsisElement) {
        return;
      }

      // Extract original content
      const bodyElement = synopsisElement.querySelector(".body") as HTMLElement;
      const originalContent = bodyElement ? bodyElement.innerHTML : "";

      // Mark as processed BEFORE making changes
      synopsisElement.setAttribute("data-ab-enhanced-synopsis", "true");

      // Disconnect observer before DOM manipulation
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Replace the entire synopsis content with our enhanced version
      const container = document.createElement("div");
      const parent = synopsisElement.parentNode;

      if (parent) {
        parent.replaceChild(container, synopsisElement);
      }

      // Render the enhanced synopsis
      import("preact").then(({ render }) => {
        if (aniListData) {
          render(<EnhancedSynopsis aniListData={aniListData} originalContent={originalContent} />, container);
        }
      });

      setIsIntegrated(true);
      globalSynopsisIntegrated = true;
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
