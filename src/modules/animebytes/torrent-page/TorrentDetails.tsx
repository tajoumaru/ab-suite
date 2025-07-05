import { useEffect } from "preact/hooks";

interface TorrentDetailsProps {
  detailsHtml: string;
}

/**
 * Component for expandable torrent details row.
 * Uses dangerouslySetInnerHTML to render the existing HTML content from the original table.
 * This is a pragmatic choice to avoid recreating the entire torrent details view.
 */
export function TorrentDetails({ detailsHtml }: TorrentDetailsProps) {
  useEffect(() => {
    // Handle tab functionality within details content
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
            // SeaDex tabs use the href target directly as the div ID
            actualDivId = hrefTarget;
          } else {
            // Original tabs use slash format in href but underscore in div IDs
            // Convert "948510/description" to "948510_description"
            actualDivId = hrefTarget.replace("/", "_");
          }

          // Extract torrent ID for finding all related content divs
          const torrentIdMatch = hrefTarget.match(/^(\d+)/) || hrefTarget.match(/^seadex_(\d+)/);
          const extractedTorrentId = torrentIdMatch ? torrentIdMatch[1] : null;

          if (extractedTorrentId) {
            // Check if target content needs dynamic loading
            const escapedId = CSS.escape(actualDivId);
            const targetDiv = contentContainer.querySelector(`#${escapedId}`) as HTMLElement;

            if (targetDiv && targetDiv.textContent?.trim() === "" && !hrefTarget.startsWith("seadex_")) {
              // Content is empty and needs dynamic loading - find the original tab and trigger it
              const originalTorrentRow = document
                .querySelector(`tr.group_torrent td a[href*="torrentid=${extractedTorrentId}"]`)
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
                      const contentNodes = Array.from(originalTargetDiv.childNodes);
                      contentNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                          const element = node as Element;
                          // Clone the element and remove any ID attributes to avoid duplicates
                          const clonedElement = element.cloneNode(true) as Element;
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
                        `div[id^="${extractedTorrentId}_"], div[id^="seadex_${extractedTorrentId}"]`,
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
            const allContentDivs = contentContainer.querySelectorAll(
              `div[id^="${extractedTorrentId}_"], div[id^="seadex_${extractedTorrentId}"]`,
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

    // Call hookScreenshots if it exists and this row is expanded
    if (window.hookScreenshots) {
      window.hookScreenshots();
    }

    return () => {
      document.removeEventListener("click", handleTabClick);
    };
  }, []);

  return (
    <tr className="ab-details-row">
      <td colSpan={100} className="ab-details-cell">
        <div className="ab-details-content">
          <div className="ab-torrent-details-html" dangerouslySetInnerHTML={{ __html: detailsHtml }} />
        </div>
      </td>
    </tr>
  );
}

// Extend Window interface for AnimeBytes site functions
declare global {
  interface Window {
    hookScreenshots?: () => void;
  }
}
