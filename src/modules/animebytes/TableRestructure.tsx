import { useSettingsStore } from "@/stores/settings";
import "@/styles/animebytes.css";
import { Download, Flag } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
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

function ModernTorrentTable({ torrents }: TableRestructureProps) {
  const { compactResolutionMode } = useSettingsStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

        // Extract the target from the href (e.g., "948510/description" or "seadx_948510")
        const hrefTarget = tabLink.href.split("#")[1];
        const tabContainer = tabLink.closest(".tabs");
        const contentContainer = tabContainer?.parentElement;

        if (contentContainer) {
          // Convert href target to actual div ID
          let actualDivId: string;

          if (hrefTarget.startsWith("seadx_")) {
            // SeaDx tabs use the href target directly as the div ID
            actualDivId = hrefTarget;
          } else {
            // Original tabs use slash format in href but underscore in div IDs
            // Convert "948510/description" to "948510_description"
            actualDivId = hrefTarget.replace("/", "_");
          }

          // Extract torrent ID for finding all related content divs
          const torrentIdMatch = hrefTarget.match(/^(\d+)/) || hrefTarget.match(/^seadx_(\d+)/);
          const torrentId = torrentIdMatch ? torrentIdMatch[1] : null;

          if (torrentId) {
            // Check if target content needs dynamic loading
            const escapedId = CSS.escape(actualDivId);
            const targetDiv = contentContainer.querySelector(`#${escapedId}`) as HTMLElement;

            if (targetDiv && targetDiv.textContent?.trim() === "" && !hrefTarget.startsWith("seadx_")) {
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
                        `div[id^="${torrentId}_"], div[id^="seadx_${torrentId}"]`,
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
                        console.log("AB Suite: Hooking screenshots for modern table");
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
              `div[id^="${torrentId}_"], div[id^="seadx_${torrentId}"]`,
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
      return torrent.resolution || "—";
    }

    const resolution = torrent.resolution || "";
    const aspectRatio = torrent.aspectRatio || "";

    // If already in wxh format, keep as-is
    if (resolution.match(/^\d+x\d+[ip]?$/)) {
      return resolution || "—";
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

    return resolution || "—";
  };

  return (
    <table className="ab-modern-torrent-table">
      <thead>
        <tr className="ab-modern-header">
          <td className="ab-col-download"></td>
          <td className="ab-col-group">Group</td>
          <td className="ab-col-format">Source</td>
          <td className="ab-col-container">Container</td>
          <td className="ab-col-video-codec">Codec</td>
          {!compactResolutionMode && <td className="ab-col-aspect-ratio">Aspect</td>}
          <td className="ab-col-resolution">Resolution</td>
          <td className="ab-col-audio">Audio</td>
          <td className="ab-col-language">Language</td>
          <td className="ab-col-subtitles">Subtitles</td>
          <td className="ab-col-size">Size</td>
          <td className="ab-col-snatches">
            <img src="/static/css/coalbytes/images/snatched.svg" alt="Snatches" title="Snatches" />
          </td>
          <td className="ab-col-seeders">
            <img src="/static/css/coalbytes/images/seeders.svg" alt="Seeders" title="Seeders" />
          </td>
          <td className="ab-col-leechers">
            <img src="/static/css/coalbytes/images/leechers.svg" alt="Leechers" title="Leechers" />
          </td>
          <td className="ab-col-flags">Flags</td>
          <td className="ab-col-report"></td>
        </tr>
      </thead>
      <tbody>
        {torrents.map((torrent) => (
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
              <td className="ab-col-group">{torrent.group || "—"}</td>
              <td className="ab-col-format">{torrent.format || "—"}</td>
              <td className="ab-col-container">{torrent.container || "—"}</td>
              <td className="ab-col-video-codec">{torrent.videoCodec || "—"}</td>
              {!compactResolutionMode && <td className="ab-col-aspect-ratio">{torrent.aspectRatio || "—"}</td>}
              <td className="ab-col-resolution">{getCompactResolution(torrent)}</td>
              <td className="ab-col-audio">{torrent.audio || "—"}</td>
              <td className="ab-col-language">{torrent.language || "—"}</td>
              <td className="ab-col-subtitles">{torrent.subtitles || "—"}</td>
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
                <td colSpan={!compactResolutionMode ? 16 : 15} className="ab-details-cell">
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

function parseTorrentRow(row: HTMLTableRowElement): ParsedTorrentRow | null {
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
      videoCodec: "",
      aspectRatio: "",
      resolution: "",
      audio: "",
      language: "",
      subtitles: "",
      group: "",
      flags: [],
      isFreeleech: false,
      originalRow: row,
      detailsContent: detailsRow,
      hasDetails,
      // Add SeaDx properties
      isSeadexBest: false,
      isSeadexAlt: false,
    };

    // Helper function to normalize resolution for future sorting
    const normalizeResolution = (res: string): string => {
      if (res.match(/^\d+(p|i)$/)) return res; // Already normalized (720p, 1080p, etc.)

      // Convert common pixel formats to p equivalents for consistency
      const resolutionMap: Record<string, string> = {
        "720x480": "480p",
        "720x400": "400p",
        "848x480": "480p",
        "856x480": "480p",
        "704x396": "396p",
        "960x540": "540p",
        // Keep uncommon resolutions as-is for now
      };

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

    // Parse each part and categorize
    for (const part of parts) {
      const cleanPart = part.trim();
      if (!cleanPart) continue;

      // Skip special icons/images in text
      if (cleanPart.includes("<img")) {
        parsed.flags?.push(cleanPart);
        continue;
      }

      // Check for resolution (both NNNxNNN and NNNp/NNNi formats)
      if (cleanPart.match(/^\d+x\d+$/) || cleanPart.match(/^\d+(p|i)$/)) {
        // If it's already in wxh format, keep it as-is; otherwise normalize
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
      // Check for video codecs
      else if (cleanPart.match(/^(h264|h265|AV1|XviD)(\s+10-bit)?$/i)) {
        parsed.videoCodec = cleanPart;
      }
      // Check for audio (enhanced to handle more formats)
      else if (cleanPart.match(/(AC3|DTS(-HD\s+MA)?|FLAC|MP3|AAC|PCM|Opus|Vorbis)\s*[\d.]*\s*(2\.0|5\.1|7\.1)?/i)) {
        parsed.audio = cleanPart;
      }
      // Check for language/audio type (including RAW)
      else if (cleanPart.match(/(dual\s+audio|japanese|english|multi|raw)$/i)) {
        parsed.language = cleanPart;
      }
      // Check for subtitles with potential group info
      else if (cleanPart.match(/(subtitle|softsub|hardsub)/i)) {
        const { clean, group } = extractGroup(cleanPart);
        parsed.subtitles = clean;
        if (group && !parsed.group) {
          parsed.group = group;
        }
      }
      // Check for container formats with potential region info
      else if (cleanPart.match(/^(MKV|MP4|AVI|ISO|IMG|VOB|M2TS)(\s*\([^)]+\))?$/i)) {
        parsed.container = cleanPart;
      }
      // Check for disc/file formats (enhanced pattern)
      else if (!parsed.format && cleanPart.match(/^(DVD\d*|BD\d*|Blu-ray|Web(-?DL)?|BluRay|TV|HDTV|WEBRip)$/i)) {
        parsed.format = cleanPart;
      }
      // If we haven't assigned format yet, and this looks like a format
      else if (!parsed.format) {
        parsed.format = cleanPart;
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

    // Check for SeaDx indicators
    // First check if SeaDx integration has already processed this row
    if (row.classList.contains("seadx-best")) {
      parsed.isSeadexBest = true;
    } else if (row.classList.contains("seadx-alt")) {
      parsed.isSeadexAlt = true;
    } else {
      // Fallback: Look for SeaDx icons in the main cell (for edge cases)
      const seadxIconBest = mainCell.querySelector('img[src*="SEADX_BEST_ICON"]');
      const seadxIconStandard = mainCell.querySelector('img[src*="SEADX_STANDARD_ICON"]');
      const seadxButton = mainCell.querySelector(".ab-seadx-icon");

      if (seadxIconBest || mainCell.innerHTML.includes("SeaDx Best Choice")) {
        parsed.isSeadexBest = true;
      } else if (seadxIconStandard || seadxButton || mainCell.innerHTML.includes("SeaDx Standard")) {
        parsed.isSeadexAlt = true;
      }
    }

    // Extract special flags from images
    const images = mainCell.querySelectorAll("img");
    images.forEach((img) => {
      parsed.flags?.push(img.outerHTML);
    });

    // Add SeaDx icon to flags if this torrent has SeaDx data
    if (parsed.isSeadexBest || parsed.isSeadexAlt) {
      // Look for SeaDx icon in the torrent cell to include it in flags
      const seadxIcon = mainCell.querySelector(".ab-seadx-icon");
      if (seadxIcon) {
        parsed.flags?.push(seadxIcon.parentElement?.outerHTML || "");
      }
    }

    return parsed as ParsedTorrentRow;
  } catch (error) {
    console.error("AB Suite: Failed to parse torrent row", error);
    return null;
  }
}

export function TableRestructure() {
  const { tableRestructureEnabled, compactResolutionMode } = useSettingsStore();
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
          .map((row) => parseTorrentRow(row))
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
            // But exclude SeaDx-related additions
            if (
              (element.classList?.contains("torrent_table") || element.querySelector?.(".torrent_table")) &&
              !element.classList?.contains("ab-modern-table-container") &&
              !element.querySelector?.(".ab-seadx-icon")
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

    // Listen for SeaDx processing completion to re-process tables
    let isReprocessing = false;

    const handleSeadxComplete = () => {
      if (isReprocessing) {
        return;
      }

      isReprocessing = true;

      // When SeaDx completes, we need to fully re-process tables to pick up SeaDx classes
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

      // Clear processed tables so they can be re-processed with SeaDx info
      setProcessedTables(new Set());

      // Re-process tables to pick up SeaDx classes - increase timeout
      setTimeout(() => {
        processTables();
        isReprocessing = false;
      }, 200); // Increased timeout to ensure DOM is stable
    };

    document.addEventListener("seadx-processing-complete", handleSeadxComplete);

    return () => {
      observer.disconnect();
      document.removeEventListener("seadx-processing-complete", handleSeadxComplete);
      // clearInterval(seadxCheckInterval);
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [tableRestructureEnabled, compactResolutionMode]);

  // This component doesn't render anything directly
  return null;
}
