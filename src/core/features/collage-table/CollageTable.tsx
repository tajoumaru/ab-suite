import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { log } from "@/lib/utils/logging";
import { useSettingsStore } from "@/lib/state/settings";

interface ParsedTitle {
  title: string;
  type: string;
  year: string;
}

interface CollageItem {
  href: string;
  imageUrl: string;
  title: string;
  alt: string;
  width: string;
  parsedTitle: ParsedTitle;
}

/**
 * Parse title string into title, type, and year components
 * Handles complex titles with colons, multiple dashes, etc.
 * Examples:
 * - "Fate/stay night [Heaven's Feel] - Movie [2017]"
 * - "Fate/kaleid liner PRISMA☆ILLYA Movie: Licht - Namae no Nai Shoujo - Movie [2021]"
 * - "Carnival Phantasm - DVD Special [2011]"
 */
function parseTitle(titleText: string): ParsedTitle {
  // Remove extra whitespace and normalize
  const cleanTitle = titleText.replace(/\s+/g, " ").trim();

  // First, extract year from the end
  const yearMatch = cleanTitle.match(/\[(\d{4})\]$/);
  if (!yearMatch) {
    // No year found, return everything as title
    return {
      title: cleanTitle,
      type: "",
      year: "",
    };
  }

  const year = yearMatch[1];
  const yearIndex = cleanTitle.lastIndexOf(`[${year}]`);
  const beforeYear = cleanTitle.substring(0, yearIndex).trim();

  // Known media types to look for (in order of specificity)
  const mediaTypes = [
    "TV Series",
    "TV Special",
    "BD Special",
    "DVD Special",
    "Movie",
    "OVA",
    "ONA",
    "Visual Novel",
    "EX Season",
  ];

  // Find the last occurrence of any media type
  let bestMatch: { type: string; index: number } | null = null;

  for (const mediaType of mediaTypes) {
    const typePattern = new RegExp(`\\s*-\\s*${mediaType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
    const match = beforeYear.match(typePattern);

    if (match) {
      const matchIndex = beforeYear.lastIndexOf(match[0]);
      if (!bestMatch || matchIndex > bestMatch.index) {
        bestMatch = {
          type: mediaType,
          index: matchIndex,
        };
      }
    }
  }

  if (bestMatch) {
    // Found a media type, split title and type
    const title = beforeYear.substring(0, bestMatch.index).trim();
    return {
      title: title,
      type: bestMatch.type,
      year: year,
    };
  }

  // Fallback: try to find the last " - " separator
  const lastDashIndex = beforeYear.lastIndexOf(" - ");
  if (lastDashIndex > 0) {
    const potentialTitle = beforeYear.substring(0, lastDashIndex).trim();
    const potentialType = beforeYear.substring(lastDashIndex + 3).trim();

    // Only use this split if the potential type is reasonable (not too long)
    if (potentialType.length <= 20) {
      return {
        title: potentialTitle,
        type: potentialType,
        year: year,
      };
    }
  }

  // Last resort: everything before year is title
  return {
    title: beforeYear,
    type: "",
    year: year,
  };
}

/**
 * Extract collage data from the original table structure
 * Handles both existing grid tables and regular tables with nym_series_title divs
 */
function extractCollageData(table: HTMLTableElement): CollageItem[] {
  const items: CollageItem[] = [];

  const rows = table.querySelectorAll("tbody tr");
  for (const row of rows) {
    const cells = row.querySelectorAll("td");

    for (const cell of cells) {
      // Skip empty cells or cells with colspan attribute (placeholders)
      if (cell.hasAttribute("colspan") || !cell.querySelector("a")) {
        continue;
      }

      const link = cell.querySelector("a") as HTMLAnchorElement;
      const img = cell.querySelector("img") as HTMLImageElement;

      if (!link || !img) {
        continue;
      }

      // Look for existing title div (nym_series_title or any div)
      let titleDiv = cell.querySelector(".nym_series_title") as HTMLDivElement;
      if (!titleDiv) {
        titleDiv = cell.querySelector("div") as HTMLDivElement;
      }

      // Extract title text from div or fallback to image title/alt
      let titleText = "";
      if (titleDiv) {
        titleText = titleDiv.textContent?.trim() || "";
      }
      if (!titleText) {
        titleText = img.title || img.alt || "";
      }

      // Convert #group_groupid links to /torrents.php?id=groupid
      let processedHref = link.href;
      const groupMatch = processedHref.match(/#group_(\d+)/);
      if (groupMatch) {
        const groupId = groupMatch[1];
        processedHref = `/torrents.php?id=${groupId}`;
      }

      items.push({
        href: processedHref,
        imageUrl: img.src,
        title: titleText,
        alt: img.alt,
        width: img.width?.toString() || "125",
        parsedTitle: parseTitle(titleText),
      });
    }
  }

  return items;
}

/**
 * Component that renders individual collage items
 */
function CollageGrid({ items }: { items: CollageItem[] }) {
  const imageContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Use GM_addElement for CSP-safe image loading
  useEffect(() => {
    items.forEach((item, index) => {
      const container = imageContainerRefs.current[index];
      if (!container || !item.imageUrl) return;

      // Clear existing content
      container.innerHTML = "";

      try {
        // Create image using GM_addElement to bypass CSP
        GM_addElement(container, "img", {
          src: item.imageUrl,
          alt: item.alt,
          class: "ab-collage-image",
        });
      } catch (_error) {
        // Fallback to regular img tag if GM_addElement fails
        container.innerHTML = `<img src="${item.imageUrl}" alt="${item.alt}" class="ab-collage-image" />`;
      }
    });
  }, [items]);

  return (
    <div className="ab-collage-grid">
      {items.map((item, index) => (
        <div key={`${item.href}-${index}`} className="ab-collage-item">
          <a href={item.href} className="ab-collage-link">
            <div
              ref={(el) => {
                imageContainerRefs.current[index] = el;
              }}
              className="ab-collage-image-container"
            />
            <div className="ab-collage-title-container">
              <div className="ab-collage-title-main">{item.parsedTitle.title}</div>
              <span>
                {item.parsedTitle.type && <span className="ab-collage-title-type">{item.parsedTitle.type}</span>}
                {item.parsedTitle.year && <span className="ab-collage-title-year"> - {item.parsedTitle.year}</span>}
              </span>
            </div>
          </a>
        </div>
      ))}
    </div>
  );
}

/**
 * Generic collage table integration component
 * Supports character pages, seiyuu pages, and airing pages
 */
export function CollageTableIntegration({
  pageType,
  settingKey = "collageTableEnhancements",
}: {
  pageType: "character" | "seiyuu" | "airing";
  settingKey?: string;
}) {
  const settingsStore = useSettingsStore();
  const [collageItems, setCollageItems] = useState<CollageItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalTableRef = useRef<HTMLTableElement | null>(null);

  // Get the appropriate setting value
  const isEnabled =
    settingKey === "seriesTitlesEnabled" ? settingsStore.seriesTitlesEnabled : settingsStore.collageTableEnhancements;

  // Determine the correct URL path to check
  const getUrlCheck = () => {
    switch (pageType) {
      case "character":
        return "/characters.php";
      case "seiyuu":
        return "/seiyuu.php";
      case "airing":
        return "/airing";
      default:
        return "";
    }
  };

  useEffect(() => {
    const urlPath = getUrlCheck();

    // Only run on the correct page type when enhancement is enabled
    if (!window.location.pathname.includes(urlPath) || !isEnabled || isInitialized) {
      return;
    }

    const initializeCollageIntegration = () => {
      // Find the original collage table
      const originalTable = document.querySelector("#collage_table") as HTMLTableElement;

      if (!originalTable) {
        return;
      }

      // Remove #discog_table element if it exists (for character/seiyuu pages)
      if (pageType !== "airing") {
        const discogTable = document.querySelector("#discog_table");
        if (discogTable) {
          discogTable.remove();
        }
      }

      try {
        log(`Initializing collage table integration for ${pageType} page`);

        // Extract data from the original table
        const extractedItems = extractCollageData(originalTable);

        if (extractedItems.length === 0) {
          return;
        }

        // Store reference to original table
        originalTableRef.current = originalTable;

        // Hide the original table
        originalTable.style.display = "none";

        // Create container for our modern grid
        const collageContainer = document.createElement("div");
        
        collageContainer.className = "ab-collage-container";

        originalTable.parentNode?.insertBefore(collageContainer, originalTable);

        // Store container reference
        containerRef.current = collageContainer;

        // Set the extracted data and mark as initialized
        setCollageItems(extractedItems);
        setIsInitialized(true);

        log(`Collage table initialized with ${extractedItems.length} items`);
      } catch (error) {
        log("Failed to initialize collage table integration", error);
      }
    };

    // Try to initialize immediately or wait for DOM
    const tryInit = () => {
      const collageTable = document.querySelector("#collage_table");
      if (collageTable) {
        initializeCollageIntegration();
      } else {
        setTimeout(tryInit, 100);
      }
    };

    tryInit();
  }, [pageType, isEnabled, isInitialized]);

  // Render the modern grid when we have data
  useEffect(() => {
    if (isInitialized && containerRef.current && collageItems.length > 0) {
      render(<CollageGrid items={collageItems} />, containerRef.current);
    }
  }, [isInitialized, collageItems]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
