import { useEffect, useRef, useState } from "preact/hooks";
import type { AniListMediaData } from "@/services/anilist";
import { aniListService } from "@/services/anilist";
import { log } from "@/utils/logging";

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
    <li className="ab-stat-item" data-stat="next-episode">
      <div>
        <strong>Next up:</strong>
      </div>
      <div>
        Ep{nextAiringEpisode.episode}: {timeLeft}
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
    <div className="box ab-enhanced-extended-info" data-ab-section="extended-info">
      <div className="head ab-extended-info-header">
        <strong>Extended Info</strong>
        {originalContent && (
          <span className="ab-extended-info-toggle">
            <button type="button" onClick={toggleContent} className="ab-toggle-button">
              {showOriginal ? "Show Enhanced" : "Show Original"}
            </button>
          </span>
        )}
      </div>

      <div className="body ab-extended-info-body">
        {showOriginal ? (
          <div className="ab-original-content" dangerouslySetInnerHTML={{ __html: originalContent || "" }} />
        ) : (
          <ul className="stats nobullet ab-enhanced-stats">
            {/* Next Episode Countdown - only show if airing */}
            {aniListData.status === "RELEASING" && aniListData.nextAiringEpisode && (
              <NextEpisodeCountdown nextAiringEpisode={aniListData.nextAiringEpisode} />
            )}
            {/* Native/Japanese Title */}
            {aniListData.title.native && (
              <li className="ab-stat-item" data-stat="native-title">
                <div>
                  <strong>Japanese Title:</strong>
                </div>
                <div>{aniListData.title.native}</div>
              </li>
            )}

            {/* English Title */}
            {aniListData.title.english && aniListData.title.english !== aniListData.title.romaji && (
              <li className="ab-stat-item" data-stat="english-title">
                <div>
                  <strong>English Title:</strong>
                </div>
                <div>{aniListData.title.english}</div>
              </li>
            )}

            {/* Start Date */}
            {startDate && (
              <li className="ab-stat-item" data-stat="start-date">
                <div>
                  <strong>Start Date:</strong>
                </div>
                <div>{startDate}</div>
              </li>
            )}

            {/* End Date */}
            {endDate && (
              <li className="ab-stat-item" data-stat="end-date">
                <div>
                  <strong>End Date:</strong>
                </div>
                <div>{endDate}</div>
              </li>
            )}

            {/* Season */}
            {seasonYear && (
              <li className="ab-stat-item" data-stat="season">
                <div>
                  <strong>Season:</strong>
                </div>
                <div>{seasonYear}</div>
              </li>
            )}

            {/* Episodes */}
            {aniListData.episodes && (
              <li className="ab-stat-item" data-stat="episodes">
                <div>
                  <strong>Episodes:</strong>
                </div>
                <div>{aniListData.episodes}</div>
              </li>
            )}

            {/* Episode Length */}
            {aniListData.duration && (
              <li className="ab-stat-item" data-stat="episode-length">
                <div>
                  <strong>Episode Length:</strong>
                </div>
                <div>{aniListData.duration} minutes</div>
              </li>
            )}

            {/* Status */}
            {aniListData.status && (
              <li className="ab-stat-item" data-stat="status">
                <div>
                  <strong>Status:</strong>
                </div>
                <div>{aniListData.status.charAt(0) + aniListData.status.slice(1).toLowerCase()}</div>
              </li>
            )}

            {/* Animation Studio */}
            {studios && (
              <li className="ab-stat-item" data-stat="animation-studio">
                <div>
                  <strong>Animation Studio:</strong>
                </div>
                <div>{studios}</div>
              </li>
            )}

            {/* Staff */}
            {primaryStaff.length > 0 && (
              <li className="ab-stat-item" data-stat="staff">
                <div>
                  <strong>Staff:</strong>
                </div>
                <div>
                  {primaryStaff.map((staff) => (
                    <div key={staff.name}>
                      {staff.name} ({staff.role})
                    </div>
                  ))}
                </div>
              </li>
            )}

            {/* Country of Origin */}
            {aniListData.countryOfOrigin && (
              <li className="ab-stat-item" data-stat="country-origin">
                <div>
                  <strong>Country of Origin:</strong>
                </div>
                <div>{aniListData.countryOfOrigin}</div>
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

  log("useEnhancedExtendedInfo called:", {
    hasAniListData: !!aniListData,
    isIntegrated,
    title: aniListData?.title?.romaji,
  });

  useEffect(() => {
    if (!aniListData) {
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
      extendedInfoElement.setAttribute("data-ab-enhanced-extended-info", "true");

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
        render(<EnhancedExtendedInfo aniListData={aniListData} originalContent={originalContent} />, container);
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
  }, [aniListData, isIntegrated]);

  return isIntegrated;
}
