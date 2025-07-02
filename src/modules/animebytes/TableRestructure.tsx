import { useSettingsStore } from "@/stores/settings";
import "@/styles/animebytes.css";
import { Check, ChevronDown, ChevronsUpDown, ChevronUp, Download, Flag, X } from "lucide-preact";
import { parseMediaInfo } from "mi-parser";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { ParsedTorrentRow } from "@/types";
import { mountComponent } from "@/utils/dom";

// Extend Window interface for AnimeBytes site functions
declare global {
  interface Window {
    hookScreenshots?: () => void;
  }
}

interface TableRestructureProps {
  torrents: ParsedTorrentRow[];
}

type SortColumn =
  | "group"
  | "format"
  | "region"
  | "container"
  | "videoCodec"
  | "resolution"
  | "audio"
  | "audioChannels"
  | "hasDualAudio"
  | "subtitles"
  | "size"
  | "snatches"
  | "seeders"
  | "leechers"
  | "flags"
  | null;
type SortDirection = "asc" | "desc";

function ModernTorrentTable({ torrents }: TableRestructureProps) {
  const { compactResolutionMode, showRegionColumn, showDualAudioColumn } = useSettingsStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  if (torrents.length === 0) {
    return null;
  }

  const toggleRowExpanded = (torrentId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(torrentId)) {
        newSet.delete(torrentId);
      } else {
        newSet.add(torrentId);
      }
      return newSet;
    });
  };

  // Handle tab functionality within details content
  useEffect(() => {
    const handleTabClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const tabLink = target.closest(".tabs a") as HTMLAnchorElement;

      // Only handle tabs that are within our modern table details
      if (tabLink?.href?.includes("#") && tabLink.closest(".ab-details-content")) {
        e.preventDefault();

        // Extract the target from the href (e.g., "948510/description" or "seadex_948510")
        const hrefTarget = tabLink.href.split("#")[1];
        const tabContainer = tabLink.closest(".tabs");
        const contentContainer = tabContainer?.parentElement;

        if (contentContainer) {
          // Convert href target to actual div ID
          let actualDivId: string;

          if (hrefTarget.startsWith("seadex_")) {
            // Seadex tabs use the href target directly as the div ID
            actualDivId = hrefTarget;
          } else {
            // Original tabs use slash format in href but underscore in div IDs
            // Convert "948510/description" to "948510_description"
            actualDivId = hrefTarget.replace("/", "_");
          }

          // Extract torrent ID for finding all related content divs
          const torrentIdMatch = hrefTarget.match(/^(\d+)/) || hrefTarget.match(/^seadex_(\d+)/);
          const torrentId = torrentIdMatch ? torrentIdMatch[1] : null;

          if (torrentId) {
            // Check if target content needs dynamic loading
            const escapedId = CSS.escape(actualDivId);
            const targetDiv = contentContainer.querySelector(`#${escapedId}`) as HTMLElement;

            if (targetDiv && targetDiv.textContent?.trim() === "" && !hrefTarget.startsWith("seadex_")) {
              // Content is empty and needs dynamic loading - find the original tab and trigger it
              const originalTorrentRow = document
                .querySelector(`tr.group_torrent td a[href*="torrentid=${torrentId}"]`)
                ?.closest("tr") as HTMLElement;
              const originalDetailsRow = originalTorrentRow?.nextElementSibling as HTMLElement;

              if (originalDetailsRow?.classList.contains("pad")) {
                const originalTabLink = originalDetailsRow.querySelector(
                  `a[href="#${hrefTarget}"]`,
                ) as HTMLAnchorElement;
                if (originalTabLink) {
                  // Trigger the original site's tab loading logic
                  originalTabLink.click();

                  // Wait a bit for the content to load, then copy it to our modern table
                  setTimeout(() => {
                    const originalTargetDiv = document.getElementById(actualDivId);
                    if (originalTargetDiv?.innerHTML.trim()) {
                      // Clear the target div first
                      targetDiv.innerHTML = "";

                      // Copy only the inner content, not the wrapper div to avoid duplicate IDs
                      // Look for the actual content inside the original div
                      const contentNodes = Array.from(originalTargetDiv.childNodes);
                      contentNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                          const element = node as Element;
                          // Clone the element and remove any ID attributes to avoid duplicates
                          const clonedElement = element.cloneNode(true) as Element;
                          // Remove IDs from cloned element and all its children to prevent duplicates
                          clonedElement.removeAttribute("id");
                          clonedElement.querySelectorAll("[id]").forEach((child) => {
                            child.removeAttribute("id");
                          });
                          targetDiv.appendChild(clonedElement);
                        } else {
                          // Copy text nodes and other non-element nodes as-is
                          targetDiv.appendChild(node.cloneNode(true));
                        }
                      });

                      // Now proceed with our normal tab switching
                      const allContentDivs = contentContainer.querySelectorAll(
                        `div[id^="${torrentId}_"], div[id^="seadex_${torrentId}"]`,
                      );
                      allContentDivs.forEach((div) => {
                        (div as HTMLElement).style.display = "none";
                      });

                      const allTabs = tabContainer.querySelectorAll("li");
                      allTabs.forEach((tab) => tab.classList.remove("selected"));

                      targetDiv.style.display = "block";
                      tabLink.parentElement?.classList.add("selected");

                      // Hook screenshots if this is the screenshots tab
                      if (hrefTarget.includes("screenshots") && window.hookScreenshots) {
                        window.hookScreenshots();
                      }
                    }
                  }, 500);
                  return;
                }
              }
            }

            // Normal tab switching for content that's already loaded
            // Hide all tab content divs for this torrent within the content container
            const allContentDivs = contentContainer.querySelectorAll(
              `div[id^="${torrentId}_"], div[id^="seadex_${torrentId}"]`,
            );
            allContentDivs.forEach((div) => {
              (div as HTMLElement).style.display = "none";
            });

            // Remove selected class from all tabs
            const allTabs = tabContainer.querySelectorAll("li");
            allTabs.forEach((tab) => tab.classList.remove("selected"));

            if (targetDiv) {
              targetDiv.style.display = "block";
              // Add selected class to clicked tab
              tabLink.parentElement?.classList.add("selected");
            } else {
              console.warn("AB Suite: Could not find target div:", actualDivId, "in container:", contentContainer);
            }
          }
        }
      }
    };

    // Add event listener to the document to handle tab clicks
    document.addEventListener("click", handleTabClick);

    return () => {
      document.removeEventListener("click", handleTabClick);
    };
  }, []);

  // Helper function to convert resolution to compact format
  const getCompactResolution = (torrent: ParsedTorrentRow): string => {
    if (!compactResolutionMode) {
      return torrent.resolution || "";
    }

    const resolution = torrent.resolution || "";
    const aspectRatio = torrent.aspectRatio || "";

    // If already in wxh format, keep as-is
    if (resolution.match(/^\d+x\d+[ip]?$/)) {
      return resolution || "";
    }

    // Convert p/i formats to wxh
    const match = resolution.match(/^(\d+)([pi])$/);
    if (match) {
      const height = parseInt(match[1]);
      const progressive = match[2];
      let width: number;

      // Use aspect ratio if available, otherwise assume 16:9
      if (aspectRatio?.includes(":")) {
        const [w, h] = aspectRatio.split(":").map((n) => parseFloat(n));
        width = Math.round((height * w) / h);
      } else {
        // Default to 16:9 for common resolutions
        width = Math.round((height * 16) / 9);
      }

      return progressive === "i" ? `${width}x${height}i` : `${width}x${height}`;
    }

    return resolution || "";
  };

  // Utility function to parse size strings to bytes for comparison
  const parseSizeToBytes = (sizeStr: string): number => {
    if (!sizeStr || sizeStr === "") return 0;

    const match = sizeStr.match(/^([\d.]+)\s*(GiB|MiB|KiB|TiB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    // Handle both binary (1024-based) and decimal (1000-based) units
    const binaryMultipliers = {
      KIB: 1024,
      MIB: 1024 * 1024,
      GIB: 1024 * 1024 * 1024,
      TIB: 1024 * 1024 * 1024 * 1024,
    };

    return value * (binaryMultipliers[unit as keyof typeof binaryMultipliers] || 0);
  };

  // Utility function to parse numeric strings
  const parseNumeric = (str: string): number => {
    if (!str || str === "") return 0;
    const num = parseInt(str.replace(/,/g, ""), 10);
    return Number.isNaN(num) ? 0 : num;
  };

  // Utility function to parse resolution for sorting (width x height)
  const parseResolutionForSorting = (
    resolutionStr: string,
    aspectRatio?: string,
  ): { width: number; height: number; isInterlaced: boolean } => {
    if (!resolutionStr || resolutionStr === "") return { width: 0, height: 0, isInterlaced: false };

    // Handle direct width x height format
    const wxhMatch = resolutionStr.match(/^(\d+)x(\d+)([ip]?)$/);
    if (wxhMatch) {
      return {
        width: parseInt(wxhMatch[1]),
        height: parseInt(wxhMatch[2]),
        isInterlaced: wxhMatch[3] === "i",
      };
    }

    // Handle p/i format (720p, 1080p, etc.)
    const pMatch = resolutionStr.match(/^(\d+)([pi])$/);
    if (pMatch) {
      const height = parseInt(pMatch[1]);
      let width: number;

      // Use aspect ratio if available, otherwise assume 16:9
      if (aspectRatio?.includes(":")) {
        const [w, h] = aspectRatio.split(":").map((n) => parseFloat(n));
        if (w && h) {
          width = Math.round((height * w) / h);
        } else {
          width = Math.round((height * 16) / 9); // fallback to 16:9
        }
      } else {
        width = Math.round((height * 16) / 9); // default to 16:9
      }

      return {
        width,
        height,
        isInterlaced: pMatch[2] === "i",
      };
    }

    // Handle special cases
    if (resolutionStr === "4K" || resolutionStr === "2160p") {
      return { width: 3840, height: 2160, isInterlaced: false };
    }

    return { width: 0, height: 0, isInterlaced: false };
  };

  // Utility function to calculate flag score for sorting
  const calculateFlagScore = (flags: string[]): number => {
    let totalScore = 0;

    for (const flag of flags) {
      const flagContent = flag.toLowerCase();

      // Check for specific flag types and assign scores
      if (flagContent.includes("seadx") || flagContent.includes("seadex")) {
        if (flagContent.includes("best")) {
          totalScore += 8; // SeaDx Best = highest score
        } else {
          totalScore += 4; // SeaDx Alt = higher than freeleech+remaster
        }
      } else if (flagContent.includes("freeleech")) {
        totalScore += 2; // Freeleech = middle score
      } else if (flagContent.includes("rmstr") || flagContent.includes("remaster")) {
        totalScore += 1; // Remaster = lowest score
      }
      // Other flags don't add to score but still count in the total
    }

    return totalScore;
  };

  // Helper function for empty-aware alphabetical sorting
  const compareStringsWithEmpties = (a: string, b: string): number => {
    // Handle empty strings - put them last for ascending
    if (!a && !b) return 0;
    if (!a) return 1; // Empty goes last
    if (!b) return -1; // Non-empty comes first

    return a.localeCompare(b);
  };

  // Utility function to parse audio channels for sorting
  const parseChannelsForSorting = (channelsStr: string): number => {
    if (!channelsStr || channelsStr === "") return 0;

    // Parse formats like "7.1", "5.1", "2.0", etc.
    const match = channelsStr.match(/^(\d+(?:\.\d+)?)(?:\s*ch)?$/i);
    if (match) {
      return parseFloat(match[1]);
    }

    return 0;
  };

  // Sorting function
  const sortTorrents = (torrents: ParsedTorrentRow[], column: SortColumn, direction: SortDirection) => {
    if (!column) return torrents;

    return [...torrents].sort((a, b) => {
      let comparison = 0;

      switch (column) {
        case "group":
        case "format":
        case "region":
        case "container":
        case "videoCodec":
        case "audio":
        case "subtitles": {
          // Alphabetical sorting with empty strings handled properly
          const aValue = (a[column] || "").toString();
          const bValue = (b[column] || "").toString();
          comparison = compareStringsWithEmpties(aValue, bValue);
          break;
        }

        case "resolution": {
          const aRes = parseResolutionForSorting(a.resolution, a.aspectRatio);
          const bRes = parseResolutionForSorting(b.resolution, b.aspectRatio);

          // Sort by height first, then width
          comparison = aRes.height - bRes.height;
          if (comparison === 0) {
            // If height is same, sort by width
            comparison = aRes.width - bRes.width;
            if (comparison === 0) {
              // If both width and height are same, progressive comes after interlaced
              comparison = (aRes.isInterlaced ? 0 : 1) - (bRes.isInterlaced ? 0 : 1);
            }
          }
          break;
        }

        case "audioChannels":
          comparison = parseChannelsForSorting(a.audioChannels) - parseChannelsForSorting(b.audioChannels);
          break;

        case "hasDualAudio":
          // Boolean sorting: true before false
          comparison = (b.hasDualAudio ? 1 : 0) - (a.hasDualAudio ? 1 : 0);
          break;

        case "flags": {
          const aScore = calculateFlagScore(a.flags);
          const bScore = calculateFlagScore(b.flags);

          // Primary sort by total flag score
          comparison = aScore - bScore;

          // Secondary sort by flag count if scores are equal
          if (comparison === 0) {
            comparison = a.flags.length - b.flags.length;
          }
          break;
        }

        case "size":
          comparison = parseSizeToBytes(a.size) - parseSizeToBytes(b.size);
          break;

        case "snatches":
        case "seeders":
        case "leechers":
          comparison = parseNumeric(a[column]) - parseNumeric(b[column]);
          break;
      }

      return direction === "desc" ? -comparison : comparison;
    });
  };

  // Memoized sorted torrents
  const sortedTorrents = useMemo(() => {
    return sortTorrents(torrents, sortColumn, sortDirection);
  }, [torrents, sortColumn, sortDirection]);

  // Handle column header clicks
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> unsorted
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        // Reset to unsorted state
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      // New column, start with ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Handle keyboard events for sorting
  const handleSortKeyDown = (e: KeyboardEvent, column: SortColumn) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSort(column);
    }
  };

  // Render sort indicator for column headers
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown size={14} className="ab-sort-indicator" />;
    }

    return sortDirection === "asc" ? (
      <ChevronUp size={14} className="ab-sort-indicator ab-sort-active" />
    ) : (
      <ChevronDown size={14} className="ab-sort-indicator ab-sort-active" />
    );
  };

  // Calculate column count for details row colspan
  const calculateColSpan = () => {
    let baseColumns = 16; // Base columns: download, group, format, container, codec, resolution, audio, channels, subtitles, size, snatches, seeders, leechers, flags, report
    if (!compactResolutionMode) baseColumns += 1; // aspect ratio column
    if (!showRegionColumn) baseColumns -= 1; // region column
    if (!showDualAudioColumn) baseColumns -= 1; // dual audio column
    return baseColumns;
  };

  return (
    <table className="ab-modern-torrent-table torrent_table">
      {" "}
      {/* `torrent_table` is needed to keep legacy styling */}
      <thead>
        <tr className="ab-modern-header">
          <td className="ab-col-download"></td>
          <td
            className="ab-col-group ab-sortable"
            onClick={() => handleSort("group")}
            onKeyDown={(e) => handleSortKeyDown(e, "group")}
            title="Sort by Group"
          >
            <div className="ab-header-content">
              Group
              {renderSortIndicator("group")}
            </div>
          </td>
          <td
            className="ab-col-format ab-sortable"
            onClick={() => handleSort("format")}
            onKeyDown={(e) => handleSortKeyDown(e, "format")}
            title="Sort by Source"
          >
            <div className="ab-header-content">
              Source
              {renderSortIndicator("format")}
            </div>
          </td>
          {showRegionColumn && (
            <td
              className="ab-col-region ab-sortable"
              onClick={() => handleSort("region")}
              onKeyDown={(e) => handleSortKeyDown(e, "region")}
              title="Sort by Region"
            >
              <div className="ab-header-content">
                Region
                {renderSortIndicator("region")}
              </div>
            </td>
          )}
          <td
            className="ab-col-container ab-sortable"
            onClick={() => handleSort("container")}
            onKeyDown={(e) => handleSortKeyDown(e, "container")}
            title="Sort by Container"
          >
            <div className="ab-header-content">
              Container
              {renderSortIndicator("container")}
            </div>
          </td>
          <td
            className="ab-col-video-codec ab-sortable"
            onClick={() => handleSort("videoCodec")}
            onKeyDown={(e) => handleSortKeyDown(e, "videoCodec")}
            title="Sort by Codec"
          >
            <div className="ab-header-content">
              Codec
              {renderSortIndicator("videoCodec")}
            </div>
          </td>
          {!compactResolutionMode && <td className="ab-col-aspect-ratio">Aspect</td>}
          <td
            className="ab-col-resolution ab-sortable"
            onClick={() => handleSort("resolution")}
            onKeyDown={(e) => handleSortKeyDown(e, "resolution")}
            title="Sort by Resolution"
          >
            <div className="ab-header-content">
              Resolution
              {renderSortIndicator("resolution")}
            </div>
          </td>
          <td
            className="ab-col-audio ab-sortable"
            onClick={() => handleSort("audio")}
            onKeyDown={(e) => handleSortKeyDown(e, "audio")}
            title="Sort by Audio"
          >
            <div className="ab-header-content">
              Audio
              {renderSortIndicator("audio")}
            </div>
          </td>
          <td
            className="ab-col-audio-channels ab-sortable"
            onClick={() => handleSort("audioChannels")}
            onKeyDown={(e) => handleSortKeyDown(e, "audioChannels")}
            title="Sort by Channels"
          >
            <div className="ab-header-content">
              Channels
              {renderSortIndicator("audioChannels")}
            </div>
          </td>
          {showDualAudioColumn && (
            <td
              className="ab-col-dual-audio ab-sortable"
              onClick={() => handleSort("hasDualAudio")}
              onKeyDown={(e) => handleSortKeyDown(e, "hasDualAudio")}
              title="Sort by Dual Audio"
            >
              <div className="ab-header-content">
                Dual Audio
                {renderSortIndicator("hasDualAudio")}
              </div>
            </td>
          )}
          <td
            className="ab-col-subtitles ab-sortable"
            onClick={() => handleSort("subtitles")}
            onKeyDown={(e) => handleSortKeyDown(e, "subtitles")}
            title="Sort by Subtitles"
          >
            <div className="ab-header-content">
              Subtitles
              {renderSortIndicator("subtitles")}
            </div>
          </td>
          <td
            className="ab-col-size ab-sortable"
            onClick={() => handleSort("size")}
            onKeyDown={(e) => handleSortKeyDown(e, "size")}
            title="Sort by Size"
          >
            <div className="ab-header-content">
              Size
              {renderSortIndicator("size")}
            </div>
          </td>
          <td
            className="ab-col-snatches ab-sortable"
            onClick={() => handleSort("snatches")}
            onKeyDown={(e) => handleSortKeyDown(e, "snatches")}
            title="Sort by Snatches"
          >
            <div className="ab-header-content">
              <img src="/static/css/coalbytes/images/snatched.svg" alt="Snatches" title="Snatches" />
              {renderSortIndicator("snatches")}
            </div>
          </td>
          <td
            className="ab-col-seeders ab-sortable"
            onClick={() => handleSort("seeders")}
            onKeyDown={(e) => handleSortKeyDown(e, "seeders")}
            title="Sort by Seeders"
          >
            <div className="ab-header-content">
              <img src="/static/css/coalbytes/images/seeders.svg" alt="Seeders" title="Seeders" />
              {renderSortIndicator("seeders")}
            </div>
          </td>
          <td
            className="ab-col-leechers ab-sortable"
            onClick={() => handleSort("leechers")}
            onKeyDown={(e) => handleSortKeyDown(e, "leechers")}
            title="Sort by Leechers"
          >
            <div className="ab-header-content">
              <img src="/static/css/coalbytes/images/leechers.svg" alt="Leechers" title="Leechers" />
              {renderSortIndicator("leechers")}
            </div>
          </td>
          <td
            className="ab-col-flags ab-sortable"
            onClick={() => handleSort("flags")}
            onKeyDown={(e) => handleSortKeyDown(e, "flags")}
            title="Sort by Flags"
          >
            <div className="ab-header-content">
              Flags
              {renderSortIndicator("flags")}
            </div>
          </td>
          <td className="ab-col-report"></td>
        </tr>
      </thead>
      <tbody>
        {sortedTorrents.map((torrent) => (
          <>
            <tr
              key={torrent.id}
              className={`ab-modern-row ${torrent.isFreeleech ? "ab-freeleech" : ""} ${
                torrent.isSeadexBest ? "ab-seadex-best" : torrent.isSeadexAlt ? "ab-seadex-alt" : ""
              } ${torrent.hasDetails ? "ab-has-details" : ""}`}
              data-torrent-id={torrent.id}
              onClick={(e) => {
                // Only toggle if clicking on the row itself, not on buttons/links
                const target = e.target as HTMLElement;
                if (torrent.hasDetails && !target.closest("a, button")) {
                  toggleRowExpanded(torrent.id);
                }
              }}
            >
              <td className="ab-col-download">
                <div className="ab-download-container">
                  <a href={torrent.downloadLink} title="Download torrent" className="ab-download-btn">
                    <Download size={16} />
                  </a>
                </div>
              </td>
              <td className="ab-col-group">{torrent.group || ""}</td>
              <td className="ab-col-format">{torrent.format || ""}</td>
              {showRegionColumn && <td className="ab-col-region">{torrent.region || ""}</td>}
              <td className="ab-col-container">{torrent.container || ""}</td>
              <td className="ab-col-video-codec">{torrent.videoCodec || ""}</td>
              {!compactResolutionMode && <td className="ab-col-aspect-ratio">{torrent.aspectRatio || ""}</td>}
              <td className="ab-col-resolution">{getCompactResolution(torrent)}</td>
              <td className="ab-col-audio">{torrent.audio || ""}</td>
              <td className="ab-col-audio-channels">{torrent.audioChannels || ""}</td>
              {showDualAudioColumn && (
                <td className="ab-col-dual-audio">
                  {torrent.hasDualAudio ? (
                    <Check size={14} className="ab-dual-audio-check" />
                  ) : (
                    <X size={14} className="ab-dual-audio-cross" />
                  )}
                </td>
              )}
              <td className="ab-col-subtitles">{torrent.subtitles || ""}</td>
              <td className="ab-col-size">{torrent.size}</td>
              <td className="ab-col-snatches">{torrent.snatches}</td>
              <td className="ab-col-seeders">{torrent.seeders}</td>
              <td className="ab-col-leechers">{torrent.leechers}</td>
              <td className="ab-col-flags">
                {torrent.flags.length > 0 && (
                  <div className="ab-flags">
                    {torrent.flags.map((flag: string) => (
                      <span
                        key={`${torrent.id}-${flag}`}
                        className="ab-flag"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: Ok
                        dangerouslySetInnerHTML={{ __html: flag }}
                      />
                    ))}
                  </div>
                )}
              </td>
              <td className="ab-col-report">
                <a href={torrent.reportLink} title="Report torrent" className="ab-report-btn">
                  <Flag size={16} />
                </a>
              </td>
            </tr>
            {torrent.hasDetails && expandedRows.has(torrent.id) && (
              <tr key={`${torrent.id}-details`} className="ab-details-row">
                <td colSpan={calculateColSpan()} className="ab-details-cell">
                  <div
                    className="ab-details-content"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Required to preserve original torrent details HTML structure
                    dangerouslySetInnerHTML={{ __html: torrent.detailsContent?.innerHTML || "" }}
                  />
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
    </table>
  );
}

function parseTorrentRow(row: HTMLTableRowElement, mediainfoParserEnabled: boolean): ParsedTorrentRow | null {
  try {
    // Get the main torrent cell (first td)
    const mainCell = row.querySelector("td:first-child");
    if (!mainCell) return null;

    // Extract download and report links
    const downloadLink = mainCell.querySelector('a[href*="/torrent/"]')?.getAttribute("href") || "";
    const reportLink = mainCell.querySelector('a[href*="/reports.php"]')?.getAttribute("href") || "";

    // Extract details link and torrent ID
    const detailsLink = mainCell.querySelector('a[href*="torrents.php"]') as HTMLAnchorElement;
    if (!detailsLink) return null;

    const torrentIdMatch = detailsLink.href.match(/torrentid=(\d+)/);
    const torrentId = torrentIdMatch ? torrentIdMatch[1] : "";

    // Get the text content and parse format information
    const linkText = detailsLink.textContent?.trim() || "";

    // Remove the arrow character at the beginning
    const formatText = linkText.replace(/^»\s*/, "");

    // Smart split by | that respects parentheses
    const smartSplit = (text: string): string[] => {
      const parts: string[] = [];
      let current = "";
      let parenDepth = 0;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === "(") {
          parenDepth++;
          current += char;
        } else if (char === ")") {
          parenDepth--;
          current += char;
        } else if (char === "|" && parenDepth === 0) {
          parts.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      if (current.trim()) {
        parts.push(current.trim());
      }

      return parts;
    };

    const parts = smartSplit(formatText);

    // Check for details row (next sibling with class "pad" and id "torrent_{torrentId}")
    let detailsRow: HTMLElement | null = null;
    let hasDetails = false;

    const nextRow = row.nextElementSibling as HTMLElement;
    if (nextRow?.classList.contains("pad") && nextRow.id === `torrent_${torrentId}`) {
      detailsRow = nextRow;
      hasDetails = true;
    }

    // Initialize parsed data
    const parsed: Partial<ParsedTorrentRow> = {
      id: torrentId,
      downloadLink,
      reportLink,
      detailsLink: detailsLink.href,
      format: "",
      container: "",
      region: "",
      videoCodec: "",
      aspectRatio: "",
      resolution: "",
      audio: "",
      audioChannels: "", // New field for channels
      hasDualAudio: false, // Changed from language to boolean
      subtitles: "",
      group: "",
      flags: [],
      isFreeleech: false,
      originalRow: row,
      detailsContent: detailsRow,
      hasDetails,
      // Add Seadex properties
      isSeadexBest: false,
      isSeadexAlt: false,
    };

    // Define all possible values from the site's dropdowns
    const validFormats = new Set(["TV", "DVD", "Blu-ray", "UHD Blu-ray", "HD DVD", "VHS", "VCD", "LD", "Web"]);

    const validContainers = new Set([
      "AVI",
      "MKV",
      "MP4",
      "OGM",
      "WMV",
      "MPG",
      "ISO",
      "VOB",
      "VOB IFO",
      "TS",
      "M2TS",
      "FLV",
      "RMVB",
    ]);

    const validCodecs = new Set([
      "h264",
      "h264 10-bit",
      "h265",
      "h265 10-bit",
      "h265 12-bit",
      "AVC",
      "AVC-10b",
      "HEVC",
      "HEVC-10b",
      "HEVC-12b",
      "XviD",
      "DivX",
      "WMV",
      "MPEG-1/2",
      "VC-1",
      "MPEG-TS",
      "DVD5",
      "DVD9",
      "RealVideo",
      "VP6",
      "VP9",
      "AV1",
    ]);

    const validAudioCodecs = new Set([
      "MP3",
      "Vorbis",
      "Opus",
      "AAC",
      "AC3",
      "TrueHD",
      "DTS",
      "DTS-ES",
      "FLAC",
      "PCM",
      "WMA",
      "MP2",
      "WAV",
      "DTS-HD",
      "DTS-HD MA",
      "RealAudio",
    ]);

    // Define valid region values
    const validRegions = new Set(["A", "B", "C", "R1", "R3", "R4", "R5", "R6", "R2 Japan", "R2 Europe"]);

    // Helper function to normalize resolution for future sorting
    const normalizeResolution = (res: string): string => {
      // Handle common resolution formats
      const resolutionMap: Record<string, string> = {
        "4K": "2160p",
        "720x480": "480p",
        "720x400": "400p",
        "848x480": "480p",
        "856x480": "480p",
        "704x396": "396p",
        "960x540": "540p",
      };

      if (res.match(/^\d+(p|i)$/)) return res; // Already normalized (720p, 1080p, etc.)
      return resolutionMap[res] || res;
    };

    // Helper function to calculate aspect ratio from resolution
    const calculateAspectRatio = (res: string): string => {
      const match = res.match(/^(\d+)x(\d+)$/);
      if (!match) return "";

      const width = parseInt(match[1]);
      const height = parseInt(match[2]);
      const ratio = width / height;

      // Common aspect ratios
      if (Math.abs(ratio - 16 / 9) < 0.01) return "16:9";
      if (Math.abs(ratio - 4 / 3) < 0.01) return "4:3";
      if (Math.abs(ratio - 3 / 2) < 0.01) return "3:2";
      if (Math.abs(ratio - 5 / 4) < 0.01) return "5:4";
      if (Math.abs(ratio - 1.85) < 0.01) return "1.85:1";
      if (Math.abs(ratio - 2.35) < 0.01) return "2.35:1";

      // Return calculated ratio rounded to 2 decimal places
      return `${ratio.toFixed(2)}:1`;
    };

    // Helper function to extract group from parenthetical info
    const extractGroup = (text: string): { clean: string; group: string } => {
      // Find the last occurrence of parentheses to handle cases like "Softsubs (TenB | Redc4t)"
      const lastParenIndex = text.lastIndexOf("(");
      const lastCloseParen = text.lastIndexOf(")");

      if (lastParenIndex !== -1 && lastCloseParen !== -1 && lastCloseParen > lastParenIndex) {
        const clean = text.substring(0, lastParenIndex).trim();
        const group = text.substring(lastParenIndex + 1, lastCloseParen).trim();
        return { clean, group };
      }
      return { clean: text, group: "" };
    };

    // Helper function to parse audio codec and channels
    const parseAudio = (audioStr: string): { codec: string; channels: string } => {
      // Extract channels (2.0, 5.1, 7.1, etc.)
      const channelMatch = audioStr.match(/([\d.]+\s*ch|\d\.\d)/i);
      const channels = channelMatch ? channelMatch[0] : "";

      // Remove channel info to get just the codec
      const codecPart = audioStr.replace(/([\d.]+\s*ch|\d\.\d)/i, "").trim();

      // Find matching audio codec
      let codec = "";
      for (const validCodec of validAudioCodecs) {
        if (codecPart.toLowerCase().includes(validCodec.toLowerCase())) {
          codec = validCodec;
          break;
        }
      }

      return { codec: codec || codecPart, channels };
    };

    // Parse each part and categorize
    for (const part of parts) {
      const cleanPart = part.trim();
      if (!cleanPart) continue;

      // Skip special icons/images in text
      if (cleanPart.includes("<img")) {
        parsed.flags?.push(cleanPart);
        continue;
      }

      // Check for resolution (including 4K and other formats)
      if (cleanPart.match(/^\d+x\d+$/) || cleanPart.match(/^\d+(p|i)$/) || cleanPart === "4K") {
        if (cleanPart.match(/^\d+x\d+$/)) {
          parsed.resolution = cleanPart; // Keep original wxh format
          // Calculate aspect ratio from pixel-based resolution if not already set
          if (!parsed.aspectRatio) {
            parsed.aspectRatio = calculateAspectRatio(cleanPart);
          }
        } else {
          parsed.resolution = normalizeResolution(cleanPart);
        }
      }
      // Check for aspect ratio (contains :)
      else if (cleanPart.match(/^\d+:\d+$/)) {
        parsed.aspectRatio = cleanPart;
      }
      // Handle DVD5/DVD9 special case first (before other codec checking)
      else if (cleanPart === "DVD5" || cleanPart === "DVD9") {
        // Restructure: DVD5/DVD9 should be codec, format should be DVD
        parsed.format = "DVD";
        parsed.videoCodec = cleanPart;
      }
      // Check for video codecs (excluding DVD5/DVD9 which are handled above)
      else if (validCodecs.has(cleanPart) && cleanPart !== "DVD5" && cleanPart !== "DVD9") {
        parsed.videoCodec = cleanPart;
      }
      // Check for audio with codec and channel parsing
      else if (
        Array.from(validAudioCodecs).some((codec: string) => cleanPart.toLowerCase().includes(codec.toLowerCase()))
      ) {
        const audioInfo = parseAudio(cleanPart);
        parsed.audio = audioInfo.codec;
        parsed.audioChannels = audioInfo.channels;
      }
      // Check for dual audio (simplified language detection)
      else if (cleanPart.match(/dual\s+audio/i)) {
        parsed.hasDualAudio = true;
      }
      // Check for subtitles (including RAW) - removed $ anchor to catch "softsubs", "hardsubs"
      else if (cleanPart.match(/(subtitle|softsub|hardsub|raw)/i)) {
        const { clean, group } = extractGroup(cleanPart);
        parsed.subtitles = clean;
        if (group && !parsed.group) {
          parsed.group = group;
        }
      }
      // Check for container formats
      else if (validContainers.has(cleanPart)) {
        parsed.container = cleanPart;
      }
      // Check for container formats with region info - extract region separately
      else if (cleanPart.match(/^([A-Z0-9\s]+)\s*\(([^)]+)\)$/i)) {
        const match = cleanPart.match(/^([A-Z0-9\s]+)\s*\(([^)]+)\)$/i);
        if (match) {
          const baseContainer = match[1].trim();
          const regionPart = match[2].trim();

          if (validContainers.has(baseContainer)) {
            parsed.container = baseContainer;
            // Check if the region part matches our valid regions
            if (validRegions.has(regionPart)) {
              parsed.region = regionPart;
            }
          }
        }
      }
      // Check for formats
      else if (validFormats.has(cleanPart)) {
        parsed.format = cleanPart;
      }
      // If we haven't assigned format yet, and this looks like a format
      else if (!parsed.format) {
        // Check if it might be one of the valid formats with different casing
        const matchingFormat = Array.from(validFormats).find((f) => f.toLowerCase() === cleanPart.toLowerCase());
        if (matchingFormat) {
          parsed.format = matchingFormat;
        } else {
          parsed.format = cleanPart;
        }
      }
    }

    // Normalize codec names to consistent format (h264 -> AVC, h265 -> HEVC)
    if (parsed.videoCodec) {
      const codecNormalizationMap: Record<string, string> = {
        h264: "AVC",
        "h264 10-bit": "AVC-10b",
        h265: "HEVC",
        "h265 10-bit": "HEVC-10b",
        "h265 12-bit": "HEVC-12b",
      };

      if (codecNormalizationMap[parsed.videoCodec]) {
        parsed.videoCodec = codecNormalizationMap[parsed.videoCodec];
      }
    }

    // Get other column data
    const cells = row.querySelectorAll("td");
    parsed.size = cells[1]?.textContent?.trim() || "";
    parsed.snatches = cells[2]?.textContent?.trim() || "";
    parsed.seeders = cells[3]?.textContent?.trim() || "";
    parsed.leechers = cells[4]?.textContent?.trim() || "";

    // Check for freeleech
    parsed.isFreeleech = mainCell.innerHTML.includes("freeleech") || row.classList.contains("freeleech");

    // Check for Seadex indicators
    // First check if Seadex integration has already processed this row
    if (row.classList.contains("seadex-best")) {
      parsed.isSeadexBest = true;
    } else if (row.classList.contains("seadex-alt")) {
      parsed.isSeadexAlt = true;
    } else {
      // Fallback: Look for Seadex icons in the main cell (for edge cases)
      const seadexIconBest = mainCell.querySelector('img[src*="SEADEX_BEST_ICON"]');
      const seadexIconAlt = mainCell.querySelector('img[src*="SEADEX_ALT_ICON"]');
      const seadexButton = mainCell.querySelector(".ab-seadex-icon");

      if (seadexIconBest || mainCell.innerHTML.includes("Seadex Best Choice")) {
        parsed.isSeadexBest = true;
      } else if (seadexIconAlt || seadexButton || mainCell.innerHTML.includes("Seadex Alt")) {
        parsed.isSeadexAlt = true;
      }
    }

    // Extract special flags from images (excluding Seadex images which are handled separately)
    const images = mainCell.querySelectorAll("img");
    images.forEach((img) => {
      // Skip Seadex images since they're handled separately
      if (!img.closest(".ab-seadex-icon")) {
        parsed.flags?.push(img.outerHTML);
      }
    });

    // Add Seadex icon to flags if this torrent has Seadex data
    if (parsed.isSeadexBest || parsed.isSeadexAlt) {
      // Look for Seadex icon in the torrent cell to include it in flags
      const seadexIcon = mainCell.querySelector(".ab-seadex-icon");
      if (seadexIcon) {
        parsed.flags?.push(seadexIcon.outerHTML);
      }
    }

    // Extract and parse mediainfo if details row is available and MediaInfo parser is enabled
    if (detailsRow && torrentId && mediainfoParserEnabled) {
      try {
        // Look for mediainfo in the details row - use CSS.escape for the ID
        const escapedId = CSS.escape(`${torrentId}_mediainfo`);
        const mediainfoElement = detailsRow.querySelector(`#${escapedId} .spoiler .codeBox pre`);

        if (mediainfoElement) {
          const mediainfoText = mediainfoElement.textContent?.trim();

          if (mediainfoText) {
            // Parse the mediainfo using mi-parser
            const parsedMediaInfo = parseMediaInfo(mediainfoText);

            // Use mediainfo to overwrite potentially mislabeled data
            if (parsedMediaInfo) {
              // Video information
              if (parsedMediaInfo.video && parsedMediaInfo.video.length > 0) {
                const video = parsedMediaInfo.video[0];

                // Resolution from width/height
                if (video.width && video.height) {
                  parsed.resolution = `${video.width}x${video.height}`;
                }

                // Aspect ratio
                if (video.displayAspectRatio) {
                  parsed.aspectRatio = video.displayAspectRatio;
                }

                // Video codec
                if (video.format) {
                  // Map common formats to standard names
                  const codecMap: Record<string, string> = {
                    AVC: "AVC",
                    HEVC: "HEVC",
                    "H.264": "AVC",
                    "H.265": "HEVC",
                  };

                  let codec = codecMap[video.format] || video.format;

                  // Check for bit depth to add suffix
                  if (video.bitDepth) {
                    if (video.bitDepth === 10) {
                      codec += "-10b";
                    } else if (video.bitDepth === 12) {
                      codec += "-12b";
                    }
                  }

                  parsed.videoCodec = codec;
                }
              }

              // Audio information
              if (parsedMediaInfo.audio && parsedMediaInfo.audio.length > 0) {
                const primaryAudio = parsedMediaInfo.audio[0];

                // Audio codec
                if (primaryAudio.format) {
                  // Map common formats to standard names
                  const audioCodecMap: Record<string, string> = {
                    "AC-3": "AC3",
                    "E-AC-3": "E-AC3",
                    "DTS-HD": "DTS-HD",
                    "DTS-HD MA": "DTS-HD MA",
                  };

                  parsed.audio = audioCodecMap[primaryAudio.format] || primaryAudio.format;
                }

                // Audio channels
                if (primaryAudio.channels) {
                  // Convert channel count to common format (e.g., 6 -> 5.1, 8 -> 7.1)
                  const channelMap: Record<number, string> = {
                    1: "1.0",
                    2: "2.0",
                    6: "5.1",
                    8: "7.1",
                  };

                  parsed.audioChannels = channelMap[primaryAudio.channels] || primaryAudio.channels.toString();
                }

                // Check for dual audio (multiple audio tracks with different languages)
                const languages = new Set(
                  parsedMediaInfo.audio.map((track) => track.language).filter((lang) => lang && lang !== "Undefined"),
                );

                if (languages.size > 1) {
                  parsed.hasDualAudio = true;
                }
              }

              // Container format
              if (parsedMediaInfo.general?.format) {
                // Map common formats to standard names
                const containerMap: Record<string, string> = {
                  Matroska: "MKV",
                  "MPEG-4": "MP4",
                  "Audio Video Interleave": "AVI",
                };

                parsed.container = containerMap[parsedMediaInfo.general.format] || parsedMediaInfo.general.format;
              }

              // Subtitle information
              if (parsedMediaInfo.text && parsedMediaInfo.text.length > 0) {
                const subtitleLanguages = new Set(
                  parsedMediaInfo.text.map((track) => track.language).filter((lang) => lang && lang !== "Undefined"),
                );

                if (subtitleLanguages.size > 0) {
                  // Helper function to abbreviate language names
                  const abbreviateLanguage = (lang: string): string => {
                    if (!lang) return "UNK";
                    const langMap: Record<string, string> = {
                      English: "EN",
                      Japanese: "JP",
                      Spanish: "ES",
                      French: "FR",
                      German: "DE",
                      Italian: "IT",
                      Portuguese: "PT",
                      Russian: "RU",
                      Chinese: "CN",
                      Korean: "KR",
                      Arabic: "AR",
                      Dutch: "NL",
                      Swedish: "SV",
                      Norwegian: "NO",
                      Danish: "DA",
                      Finnish: "FI",
                    };
                    return langMap[lang] || lang.slice(0, 2).toUpperCase();
                  };

                  const langArray = Array.from(subtitleLanguages);

                  if (langArray.length === 1) {
                    // Single language: just show the language name
                    parsed.subtitles = langArray[0];
                  } else if (langArray.length === 2) {
                    // Dual: show abbreviated languages
                    const abbrevs = langArray.map((lang) => abbreviateLanguage(lang || ""));
                    parsed.subtitles = `Dual (${abbrevs.join(", ")})`;
                  } else {
                    // Multi: show count
                    parsed.subtitles = `Multi (${langArray.length})`;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`AB Suite: Error parsing mediainfo for torrent ${torrentId}:`, error);
      }
    }

    return parsed as ParsedTorrentRow;
  } catch (error) {
    console.error("AB Suite: Failed to parse torrent row", error);
    return null;
  }
}

export function TableRestructure() {
  const { tableRestructureEnabled, compactResolutionMode, mediainfoParserEnabled } = useSettingsStore();
  const [processedTables, setProcessedTables] = useState<Set<Element>>(new Set());
  const cleanupMap = new WeakMap<Element, () => void>();

  useEffect(() => {
    // Early exit if feature is disabled or not on torrents page
    if (!tableRestructureEnabled || !window.location.pathname.includes("/torrents.php")) {
      // If feature is disabled and we have processed tables, restore them
      if (processedTables.size > 0) {
        processedTables.forEach((table) => {
          const htmlTable = table as HTMLElement;
          // Show the original table
          htmlTable.style.display = "";

          // Remove the modern table container
          const modernContainer = htmlTable.nextSibling as Element;
          if (modernContainer?.classList?.contains("ab-modern-table-container")) {
            modernContainer.remove();
          }

          // Clean up any stored cleanup functions
          const cleanup = cleanupMap.get(table);
          if (cleanup) {
            cleanup();
            cleanupMap.delete(table);
          }
        });

        // Clear processed tables
        setProcessedTables(new Set());
      }
      return;
    }

    const processTables = () => {
      // Find all torrent tables
      const tables = document.querySelectorAll(".torrent_table");

      tables.forEach((table) => {
        if (processedTables.has(table)) {
          return; // Already processed this table
        }

        // Also check if a modern table container already exists for this table
        const nextSibling = table.nextSibling as Element;
        if (nextSibling?.classList?.contains("ab-modern-table-container")) {
          // Modern table already exists, mark as processed and skip
          setProcessedTables((prev) => new Set(prev).add(table));
          return;
        }

        // Find torrent rows (skip header rows)
        const torrentRows = Array.from(table.querySelectorAll("tr.group_torrent")) as HTMLTableRowElement[];

        if (torrentRows.length === 0) {
          return;
        }

        // Parse all torrent rows
        const parsedTorrents = torrentRows
          .map((row) => parseTorrentRow(row, mediainfoParserEnabled))
          .filter((torrent): torrent is ParsedTorrentRow => torrent !== null);

        if (parsedTorrents.length === 0) {
          return;
        }

        // Hide the entire original table
        (table as HTMLElement).style.display = "none";

        // Create container for new table and insert it after the original
        const container = document.createElement("div");
        container.className = "ab-modern-table-container";
        table.parentNode?.insertBefore(container, table.nextSibling);

        // Mount the modern table
        const cleanup = mountComponent(<ModernTorrentTable torrents={parsedTorrents} />, container, "replace");

        // Mark this table as processed
        setProcessedTables((prev) => new Set(prev).add(table));

        // Store cleanup function for potential future use
        cleanupMap.set(table, cleanup);
      });
    };

    // Process existing tables
    processTables();

    // Set up observer for dynamically loaded content
    // Use more specific observation to avoid triggering on our own changes
    let processingTimeout: NodeJS.Timeout | null = null;

    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        // Only process if new nodes were added that might contain torrent tables
        // Ignore changes to existing modern tables to prevent loops
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if the added node contains torrent tables or is one itself
            // But exclude Seadex-related additions
            if (
              (element.classList?.contains("torrent_table") || element.querySelector?.(".torrent_table")) &&
              !element.classList?.contains("ab-modern-table-container") &&
              !element.querySelector?.(".ab-seadex-icon")
            ) {
              shouldProcess = true;
              break;
            }
          }
        }
        if (shouldProcess) break;
      }

      if (shouldProcess) {
        // Debounce to prevent multiple rapid calls
        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }
        processingTimeout = setTimeout(() => {
          processTables();
          processingTimeout = null;
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      // Don't observe attribute changes to prevent loops from class additions
      attributes: false,
    });

    // Listen for Seadex processing completion to re-process tables
    let isReprocessing = false;

    const handleSeadexComplete = () => {
      if (isReprocessing) {
        return;
      }

      isReprocessing = true;

      // When Seadex completes, we need to fully re-process tables to pick up Seadex classes
      // Force cleanup of ALL modern tables, regardless of processedTables state

      // Find ALL torrent tables and force cleanup of their modern containers
      const allTorrentTables = document.querySelectorAll(".torrent_table");

      allTorrentTables.forEach((table) => {
        const htmlTable = table as HTMLElement;

        // Show the original table
        htmlTable.style.display = "";

        // Remove the modern table container (check next sibling)
        const modernContainer = htmlTable.nextSibling as Element;
        if (modernContainer?.classList?.contains("ab-modern-table-container")) {
          modernContainer.remove();
        }

        // Clean up any stored cleanup functions
        const cleanup = cleanupMap.get(table);
        if (cleanup) {
          cleanup();
          cleanupMap.delete(table);
        }
      });

      // Clear processed tables so they can be re-processed with Seadex info
      setProcessedTables(new Set());

      // Re-process tables to pick up Seadex classes - increase timeout
      setTimeout(() => {
        processTables();
        isReprocessing = false;
      }, 200); // Increased timeout to ensure DOM is stable
    };

    document.addEventListener("seadex-processing-complete", handleSeadexComplete);

    return () => {
      observer.disconnect();
      document.removeEventListener("seadex-processing-complete", handleSeadexComplete);
      // clearInterval(seadexCheckInterval);
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [tableRestructureEnabled, compactResolutionMode, mediainfoParserEnabled]);

  // This component doesn't render anything directly
  return null;
}
