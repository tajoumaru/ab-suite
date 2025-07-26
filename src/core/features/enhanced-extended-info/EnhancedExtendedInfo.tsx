import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { log } from "@/lib/utils/logging";
import type { AniListMediaData } from "@/services/anilist";
import { aniListService } from "@/services/anilist";

interface NextEpisodeCountdownProps {
  nextAiringEpisode: AniListMediaData["nextAiringEpisode"];
}

function NextEpisodeCountdown({ nextAiringEpisode }: NextEpisodeCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!nextAiringEpisode?.airingAt) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const airingAt = nextAiringEpisode.airingAt;
      if (!airingAt) return;
      const secondsLeft = airingAt - now;

      if (secondsLeft <= 0) {
        setTimeLeft("Aired!");
        return;
      }

      const days = Math.floor(secondsLeft / (24 * 60 * 60));
      const hours = Math.floor((secondsLeft % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((secondsLeft % (60 * 60)) / 60);
      const seconds = secondsLeft % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextAiringEpisode?.airingAt]);

  if (!nextAiringEpisode?.airingAt) return null;

  return (
    <li mb="8px" p="0" data-stat="next-episode">
      <div>
        <strong text="white">Next up:</strong>
      </div>
      <div>
        <span text="#ddd">
          Ep{nextAiringEpisode.episode}: {timeLeft}
        </span>
      </div>
    </li>
  );
}

// Global integration tracking to prevent double integration
let globalExtendedInfoIntegrated = false;

interface EnhancedExtendedInfoProps {
  aniListData: AniListMediaData;
  originalContent?: string;
}

/**
 * Enhanced extended info component that replaces the original extended info
 * with enriched AniList data while maintaining the original styling
 */
export function EnhancedExtendedInfo({ aniListData, originalContent }: EnhancedExtendedInfoProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  // Format dates in readable format
  const formatReadableDate = (
    dateObj: { year: number | null; month: number | null; day: number | null } | null,
  ): string | null => {
    if (!dateObj || !dateObj.year) return null;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = dateObj.month ? months[dateObj.month - 1] : "Jan";
    const day = dateObj.day || 1;
    const year = dateObj.year;

    return `${month} ${day}, ${year}`;
  };

  const startDate = formatReadableDate(aniListData.startDate);
  const endDate = formatReadableDate(aniListData.endDate);

  // Format season and year
  const seasonYear = aniListService.formatSeasonYear(aniListData.season, aniListData.seasonYear);

  // Format studios
  const studios = aniListService.formatStudios(aniListData.studios);

  // Get primary staff
  const primaryStaff = aniListService.getPrimaryStaff(aniListData.staff);

  log("EnhancedExtendedInfo render:", {
    hasOriginalContent: !!originalContent,
    originalContentLength: originalContent?.length || 0,
    showOriginal,
    selectedContent: showOriginal ? "original" : "enhanced",
    hasStartDate: !!startDate,
    hasEndDate: !!endDate,
    hasSeasonYear: !!seasonYear,
    hasStudios: !!studios,
    primaryStaffCount: primaryStaff.length,
    originalContentPreview: `${originalContent?.substring(0, 100)}...`,
  });

  const toggleContent = () => {
    log("ExtendedInfo toggle clicked, current showOriginal:", showOriginal);
    setShowOriginal(!showOriginal);
    log("ExtendedInfo toggle new state will be:", !showOriginal);
  };

  return (
    <div mb="20px" className="box" data-ab-section="extended-info">
      <div justify="between" items="center" flex="~ wrap" gap="10px" className="head">
        <strong>Info</strong>
        {originalContent && (
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
              {showOriginal ? "Show Enhanced" : "Show Original"}
            </button>
          </span>
        )}
      </div>

      <div className="body">
        {showOriginal ? (
          <div dangerouslySetInnerHTML={{ __html: originalContent || "" }} />
        ) : (
          <ul list="none" p="0" m="0" className="stats nobullet">
            {/* Next Episode Countdown - only show if airing */}
            {aniListData.status === "RELEASING" && aniListData.nextAiringEpisode && (
              <NextEpisodeCountdown nextAiringEpisode={aniListData.nextAiringEpisode} />
            )}
            {/* Native/Japanese Title */}
            {aniListData.title.native && (
              <li mb="8px" p="0" data-stat="native-title">
                <div>
                  <strong text="white">Japanese Title:</strong>
                </div>
                <div text="#ddd">{aniListData.title.native}</div>
              </li>
            )}

            {/* English Title */}
            {aniListData.title.english && aniListData.title.english !== aniListData.title.romaji && (
              <li mb="8px" p="0" data-stat="english-title">
                <div>
                  <strong text="white">English Title:</strong>
                </div>
                <div text="#ddd">{aniListData.title.english}</div>
              </li>
            )}

            {/* Start Date */}
            {startDate && (
              <li mb="8px" p="0" data-stat="start-date">
                <div>
                  <strong text="white">Start Date:</strong>
                </div>
                <div text="#ddd">{startDate}</div>
              </li>
            )}

            {/* End Date */}
            {endDate && (
              <li mb="8px" p="0" data-stat="end-date">
                <div>
                  <strong text="white">End Date:</strong>
                </div>
                <div text="#ddd">{endDate}</div>
              </li>
            )}

            {/* Season */}
            {seasonYear && (
              <li mb="8px" p="0" data-stat="season">
                <div>
                  <strong text="white">Season:</strong>
                </div>
                <div text="#ddd">{seasonYear}</div>
              </li>
            )}

            {/* Episodes */}
            {aniListData.episodes && (
              <li mb="8px" p="0" data-stat="episodes">
                <div>
                  <strong text="white">Episodes:</strong>
                </div>
                <div text="#ddd">{aniListData.episodes}</div>
              </li>
            )}

            {/* Episode Length */}
            {aniListData.duration && (
              <li mb="8px" p="0" data-stat="episode-length">
                <div>
                  <strong text="white">Episode Length:</strong>
                </div>
                <div text="#ddd">{aniListData.duration} minutes</div>
              </li>
            )}

            {/* Status */}
            {aniListData.status && (
              <li mb="8px" p="0" data-stat="status">
                <div>
                  <strong text="white">Status:</strong>
                </div>
                <div text="#ddd">{aniListData.status.charAt(0) + aniListData.status.slice(1).toLowerCase()}</div>
              </li>
            )}

            {/* Animation Studio */}
            {studios && (
              <li mb="8px" p="0" data-stat="animation-studio">
                <div>
                  <strong text="white">Animation Studio:</strong>
                </div>
                <div text="#ddd">{studios}</div>
              </li>
            )}

            {/* Staff */}
            {primaryStaff.length > 0 && (
              <li mb="8px" p="0" data-stat="staff">
                <div>
                  <strong text="white">Staff:</strong>
                </div>
                <div>
                  {primaryStaff.map((staff, index) => (
                    <div key={`${staff.name}-${staff.role}-${index}`} text="#ddd">
                      {staff.name} ({staff.role})
                    </div>
                  ))}
                </div>
              </li>
            )}

            {/* Country of Origin */}
            {aniListData.countryOfOrigin && (
              <li mb="8px" p="0" data-stat="country-origin">
                <div>
                  <strong text="white">Country of Origin:</strong>
                </div>
                <div text="#ddd">{aniListData.countryOfOrigin}</div>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage enhanced extended info integration
 */
export function useEnhancedExtendedInfo(aniListData: AniListMediaData | null) {
  const [isIntegrated, setIsIntegrated] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  // Memoize the data to prevent unnecessary re-runs
  const memoizedData = useMemo(() => {
    if (!aniListData) return null;
    return {
      title: aniListData.title?.romaji,
      hasData: true,
    };
  }, [aniListData?.title?.romaji]);

  // Only log when state changes
  useEffect(() => {
    if (memoizedData || isIntegrated) {
      log("useEnhancedExtendedInfo called:", {
        hasAniListData: !!memoizedData,
        isIntegrated,
        title: memoizedData?.title,
      });
    }
  }, [memoizedData, isIntegrated]);

  useEffect(() => {
    if (!memoizedData) {
      return;
    }

    if (isIntegrated || globalExtendedInfoIntegrated) {
      log("useEnhancedExtendedInfo: Already integrated, skipping");
      log("useEnhancedExtendedInfo: No aniListData, returning");
      return;
    }

    if (isIntegrated) {
      log("useEnhancedExtendedInfo: Already integrated, skipping");
      return;
    }

    log("useEnhancedExtendedInfo: Starting integration");

    const integrateExtendedInfo = () => {
      log(
        "integrateExtendedInfo called, isIntegrated:",
        isIntegrated,
        "globalIntegrated:",
        globalExtendedInfoIntegrated,
      );

      // If already integrated globally, skip
      if (globalExtendedInfoIntegrated) {
        log("ExtendedInfo already integrated globally, skipping");
        return;
      }

      // If already integrated locally, skip
      if (isIntegrated) {
        log("ExtendedInfo already integrated locally, skipping");
        return;
      }

      // Find the existing extended info box
      const boxes = document.querySelectorAll(".box:not([data-ab-enhanced-extended-info])");
      let extendedInfoElement: HTMLElement | null = null;

      log("Looking for Extended Info box, found boxes:", boxes.length);

      // Look for the box with "Extended Info" header
      for (const box of boxes) {
        const headerElement = box.querySelector(".head strong");
        const headerText = headerElement?.textContent;
        log("Checking box with header:", headerText);
        if (headerText?.includes("Extended Info")) {
          extendedInfoElement = box as HTMLElement;
          log("Found Extended Info box");
          break;
        }
      }

      if (!extendedInfoElement) {
        log("No Extended Info element found");
        return;
      }

      // Extract original content from .stats instead of .body
      const statsElement = extendedInfoElement.querySelector(".stats") as HTMLElement;
      const originalContent = statsElement ? statsElement.innerHTML : "";

      log("Extracting original extended info content:", {
        hasStatsElement: !!statsElement,
        originalContentLength: originalContent.length,
        originalContentPreview: `${originalContent.substring(0, 100)}...`,
      });

      // Mark as processed BEFORE making changes
      // extendedInfoElement.setAttribute("data-ab-enhanced-extended-info", "true");

      // Disconnect observer before DOM manipulation
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Replace the entire extended info box with our enhanced version
      const container = document.createElement("div");
      extendedInfoElement.parentNode?.replaceChild(container, extendedInfoElement);

      // Render the enhanced extended info
      import("preact").then(({ render }) => {
        log("Rendering enhanced extended info with:", {
          hasOriginalContent: !!originalContent,
          originalContentLength: originalContent.length,
        });
        if (aniListData) {
          render(<EnhancedExtendedInfo aniListData={aniListData} originalContent={originalContent} />, container);
        }
        log("Enhanced extended info rendered successfully");
      });

      setIsIntegrated(true);
      globalExtendedInfoIntegrated = true;
      log("AB Suite: Enhanced extended info integrated successfully");
    };

    // Try to integrate immediately
    integrateExtendedInfo();

    // Only set up observer if not integrated
    if (!isIntegrated) {
      // Watch for dynamic content changes
      const observer = new MutationObserver((mutations) => {
        // Check if any mutations added an extended info box
        const hasNewExtendedInfo = mutations.some((mutation) => {
          return Array.from(mutation.addedNodes).some((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const element = node as Element;
            return (
              element.querySelector?.(".box .head strong")?.textContent?.includes("Extended Info") ||
              (element.classList?.contains("box") &&
                element.querySelector(".head strong")?.textContent?.includes("Extended Info"))
            );
          });
        });

        if (hasNewExtendedInfo) {
          integrateExtendedInfo();
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
