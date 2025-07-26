import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { CollageTableIntegration } from "@/core/features/collage-table/CollageTable";
import { useSettingsStore } from "@/lib/state/settings";
import { err, log } from "@/lib/utils/logging";
import { type AniListSeiyuuData, seiyuuService } from "@/services/seiyuu";

interface SeiyuuMetadata {
  source: "anilist";
  data: AniListSeiyuuData;
}

/**
 * Extract image and description from existing AnimeByte description box
 */
function extractOriginalContent() {
  const descriptionBox = document.querySelector(".box .head strong")?.textContent?.includes("Description")
    ? (document.querySelector(".box .head strong")?.closest(".box") as HTMLElement)
    : null;

  if (!descriptionBox) return { originalImage: null, originalDescription: null };

  // Extract image
  const img = descriptionBox.querySelector("img") as HTMLImageElement;
  const originalImage = img ? { src: img.src, alt: img.alt || "", width: img.width || 220 } : null;

  // Extract description text (from .pad div, excluding image)
  const padElement = descriptionBox.querySelector(".pad");
  let originalDescription = null;
  if (padElement) {
    // Clone the element to avoid modifying the original
    const clone = padElement.cloneNode(true) as HTMLElement;
    // Remove image container if it exists
    const imageContainer = clone.querySelector('div[style*="text-align:center"]');
    if (imageContainer) imageContainer.remove();
    originalDescription = clone.innerHTML.trim();
  }

  // Remove the original description box
  descriptionBox.remove();

  return { originalImage, originalDescription };
}

/**
 * Component that renders seiyuu image in sidebar
 */
function SeiyuuImageBox({
  seiyuuData,
  originalImage,
}: {
  seiyuuData: SeiyuuMetadata;
  originalImage: { src: string; alt: string; width: number } | null;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const data = seiyuuData.data;
  const imageUrl = data.image.large;
  const nativeName = data.name.native;
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Use GM_addElement to bypass CSP restrictions for external images
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    // Clear existing content
    container.innerHTML = "";

    const currentImageUrl = showOriginal && originalImage ? originalImage.src : imageUrl;
    const currentAltText = showOriginal && originalImage ? originalImage.alt : nativeName || "Seiyuu";

    if (!currentImageUrl) return;

    try {
      // Create image using GM_addElement to bypass CSP
      GM_addElement(container, "img", {
        src: currentImageUrl,
        alt: currentAltText,
        class: "ab-seiyuu-cover-image",
      });

      log("Seiyuu image loaded successfully via GM_addElement");
    } catch (error) {
      err("Failed to load seiyuu image via GM_addElement", error);
      // Fallback to regular img tag if GM_addElement fails
      container.innerHTML = `<img src="${currentImageUrl}" alt="${currentAltText}" class="ab-seiyuu-cover-image" />`;
    }
  }, [imageUrl, nativeName, showOriginal, originalImage]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="box">
      <div className="head" flex justify="between" items="center">
        <strong>Seiyuu Image</strong>
        {originalImage && (
          <span flex items="center">
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              bg="transparent"
              border="1px solid #ccc"
              text="white"
              hover-bg="[rgba(255,255,255,0.1)]"
              hover-border="white"
            >
              {showOriginal ? "Show AniList" : "Show Original"}
            </button>
          </span>
        )}
      </div>
      <div text="center" p="20px">
        <div ref={imageContainerRef} />
        {nativeName && (
          <div mt="8px" text="14px #666" font="bold">
            {nativeName}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Component that renders seiyuu description in main column
 */
function SeiyuuDescriptionBox({
  seiyuuData,
  originalDescription,
}: {
  seiyuuData: SeiyuuMetadata;
  originalDescription: string | null;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const data = seiyuuData.data;
  const descriptionRef = useRef<HTMLDivElement>(null);

  // Helper function to format birthday
  const formatBirthday = (
    dateOfBirth: { year: number | null; month: number | null; day: number | null } | null,
  ): string | null => {
    if (!dateOfBirth || !dateOfBirth.month || !dateOfBirth.day) {
      return null;
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[dateOfBirth.month - 1]} ${dateOfBirth.day}`;
  };

  // Helper function to format death date
  const formatDeathDate = (
    dateOfDeath: { year: number | null; month: number | null; day: number | null } | null,
  ): string | null => {
    if (!dateOfDeath || !dateOfDeath.month || !dateOfDeath.day) {
      return null;
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[dateOfDeath.month - 1]} ${dateOfDeath.day}`;
  };

  // Helper function to format years active
  const formatYearsActive = (yearsActive: number[] | null): string | null => {
    if (!yearsActive || yearsActive.length === 0) {
      return null;
    }

    if (yearsActive.length === 1) {
      return `${yearsActive[0]} - Present`;
    }

    const sortedYears = [...yearsActive].sort((a, b) => a - b);
    return `${sortedYears[0]} - ${sortedYears[sortedYears.length - 1]}`;
  };

  if (
    !data.description &&
    !data.age &&
    !data.gender &&
    !data.bloodType &&
    !data.dateOfBirth &&
    !data.dateOfDeath &&
    !data.homeTown &&
    !data.primaryOccupations &&
    !data.yearsActive &&
    !originalDescription
  ) {
    return null;
  }

  // Process description and handle spoilers
  const processDescription = (text: string): string => {
    // Replace spoiler content with clickable elements
    let spoilerCount = 0;

    const textWithSpoilerPlaceholders = text.replace(/~!(.*?)!~/g, (_, content) => {
      const spoilerId = `spoiler-${spoilerCount++}`;
      return `<span class="ab-spoiler-container" data-spoiler-id="${spoilerId}">
        <span class="ab-spoiler-hidden">Spoiler, click to view</span>
        <span class="ab-spoiler-content" style="display: none;">${content.trim()}</span>
      </span>`;
    });

    // Apply other formatting
    return textWithSpoilerPlaceholders
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>') // Markdown links
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold markdown
      .replace(/__(.*?)__/g, "<strong>$1</strong>") // Bold underscore
      .replace(/\n\n/g, "</p><p>") // Double newlines to paragraphs
      .replace(/\n/g, "<br>"); // Replace newlines with line breaks
  };

  const cleanDescription = data.description ? processDescription(data.description) : "";

  // Add click handlers for spoiler tags
  useEffect(() => {
    if (!descriptionRef.current) return;

    const handleSpoilerClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("ab-spoiler-hidden")) {
        const container = target.closest(".ab-spoiler-container") as HTMLElement;
        if (container) {
          const hiddenSpan = container.querySelector(".ab-spoiler-hidden") as HTMLElement;
          const contentSpan = container.querySelector(".ab-spoiler-content") as HTMLElement;
          if (hiddenSpan && contentSpan) {
            hiddenSpan.style.display = "none";
            contentSpan.style.display = "inline";
          }
        }
      }
    };

    descriptionRef.current.addEventListener("click", handleSpoilerClick);

    return () => {
      if (descriptionRef.current) {
        descriptionRef.current.removeEventListener("click", handleSpoilerClick);
      }
    };
  }, [cleanDescription]);

  const birthday = formatBirthday(data.dateOfBirth);
  const deathDate = formatDeathDate(data.dateOfDeath);
  const yearsActive = formatYearsActive(data.yearsActive);
  const hasSeiyuuInfo =
    data.age ||
    data.gender ||
    data.bloodType ||
    birthday ||
    deathDate ||
    data.homeTown ||
    data.primaryOccupations ||
    yearsActive;

  return (
    <div className="box">
      <div className="head" flex justify="between" items="center">
        <strong>Seiyuu Information</strong>
        {originalDescription && (
          <span flex items="center">
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              bg="transparent"
              border="1px solid #ccc"
              text="white"
              hover-bg="[rgba(255,255,255,0.1)]"
              hover-border="white"
            >
              {showOriginal ? "Show AniList" : "Show Original"}
            </button>
          </span>
        )}
      </div>
      <div p="10px">
        {showOriginal ? (
          <div dangerouslySetInnerHTML={{ __html: originalDescription || "" }} />
        ) : (
          <>
            {hasSeiyuuInfo && (
              <div flex flex-direction="column" justify="center" p="[8px_12px]">
                {birthday && (
                  <div>
                    <strong>Birthday:</strong> {birthday}
                  </div>
                )}
                {deathDate && (
                  <div>
                    <strong>Date of Death:</strong> {deathDate}
                  </div>
                )}
                {data.age && (
                  <div>
                    <strong>Age:</strong> {data.age}
                  </div>
                )}
                {data.gender && (
                  <div>
                    <strong>Gender:</strong> {data.gender}
                  </div>
                )}
                {data.bloodType && (
                  <div>
                    <strong>Blood Type:</strong> {data.bloodType}
                  </div>
                )}
                {data.homeTown && (
                  <div>
                    <strong>Hometown:</strong> {data.homeTown}
                  </div>
                )}
                {data.primaryOccupations && data.primaryOccupations.length > 0 && (
                  <div>
                    <strong>Occupations:</strong> {data.primaryOccupations.join(", ")}
                  </div>
                )}
                {yearsActive && (
                  <div>
                    <strong>Years Active:</strong> {yearsActive}
                  </div>
                )}
              </div>
            )}
            {data.description && (
              <div ref={descriptionRef} dangerouslySetInnerHTML={{ __html: `<p>${cleanDescription}</p>` }} />
            )}
          </>
        )}
        {!showOriginal && (
          <div mt="10px" text="12px #888" italic>
            Source: AniList
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to access seiyuu page data from other components
 */
export function useSeiyuuPageData() {
  const [seiyuuData, setSeiyuuData] = useState<SeiyuuMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeiyuuData = async (seiyuuName: string) => {
    setLoading(true);
    setError(null);

    try {
      const metadata = await seiyuuService.fetchSeiyuuMetadata(seiyuuName);
      if (metadata) {
        setSeiyuuData(metadata);
      } else {
        setError("No seiyuu data found");
      }
    } catch (error) {
      err("Failed to fetch seiyuu metadata", error);
      setError("Failed to fetch seiyuu data");
    } finally {
      setLoading(false);
    }
  };

  return {
    seiyuuData,
    loading,
    error,
    fetchSeiyuuData,
  };
}

/**
 * Main integration component that handles DOM takeover for seiyuu pages
 */
export function SeiyuuPage() {
  const { characterPageEnhancements } = useSettingsStore();
  const [seiyuuData, setSeiyuuData] = useState<SeiyuuMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [originalContent, setOriginalContent] = useState<{
    originalImage: { src: string; alt: string; width: number } | null;
    originalDescription: string | null;
  }>({
    originalImage: null,
    originalDescription: null,
  });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const descriptionContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // Check if we're on a seiyuu page
  const isSeiyuuPage = window.location.pathname.includes("/seiyuu.php");

  useEffect(() => {
    if (!isSeiyuuPage || !characterPageEnhancements || isInitialized.current) {
      return;
    }

    const initializeIntegration = async () => {
      // Extract seiyuu name from page
      const titleElement = document.querySelector("#content h2");
      if (!titleElement || !titleElement.textContent) {
        return;
      }

      const seiyuuName = titleElement.textContent.trim();
      log("Initializing seiyuu page integration for:", seiyuuName);

      // Find insertion points
      const sidebar = document.querySelector(".sidebar");
      const mainColumn = document.querySelector(".main_column");

      if (!sidebar || !mainColumn) {
        log("Could not find sidebar or main_column elements");
        return;
      }

      try {
        // Extract original content first
        const extracted = extractOriginalContent();
        setOriginalContent(extracted);

        // Create containers
        const imageContainer = document.createElement("div");
        // imageContainer.className = "ab-seiyuu-cover-image-container";

        const descriptionContainer = document.createElement("div");
        // descriptionContainer.className = "ab-seiyuu-description-container";

        // Insert as first child in sidebar and main column
        sidebar.insertBefore(imageContainer, sidebar.firstChild);
        mainColumn.insertBefore(descriptionContainer, mainColumn.firstChild);

        // Store references
        imageContainerRef.current = imageContainer;
        descriptionContainerRef.current = descriptionContainer;

        isInitialized.current = true;

        // Fetch seiyuu data
        setLoading(true);
        const metadata = await seiyuuService.fetchSeiyuuMetadata(seiyuuName);
        if (metadata) {
          setSeiyuuData(metadata);
          log("Successfully fetched seiyuu metadata:", metadata);
        }
        setLoading(false);
      } catch (error) {
        err("Failed to initialize seiyuu page integration", error);
        setLoading(false);
      }
    };

    // Try to initialize immediately or wait for DOM
    const tryInit = () => {
      const titleElement = document.querySelector("#content h2");
      const sidebar = document.querySelector(".sidebar");
      const mainColumn = document.querySelector(".main_column");

      if (titleElement && sidebar && mainColumn) {
        initializeIntegration();
      } else {
        setTimeout(tryInit, 100);
      }
    };

    tryInit();
  }, [isSeiyuuPage, characterPageEnhancements]);

  // Render seiyuu image when data is available
  useEffect(() => {
    if (imageContainerRef.current && seiyuuData && !loading) {
      render(
        <SeiyuuImageBox seiyuuData={seiyuuData} originalImage={originalContent.originalImage} />,
        imageContainerRef.current,
      );
    }
  }, [seiyuuData, loading, originalContent.originalImage]);

  // Render seiyuu description when data is available
  useEffect(() => {
    if (descriptionContainerRef.current && seiyuuData && !loading) {
      render(
        <SeiyuuDescriptionBox seiyuuData={seiyuuData} originalDescription={originalContent.originalDescription} />,
        descriptionContainerRef.current,
      );
    }
  }, [seiyuuData, loading, originalContent.originalDescription]);

  // Render loading state
  useEffect(() => {
    if (loading && imageContainerRef.current && descriptionContainerRef.current) {
      render(
        <div className="box">
          <div className="head">
            <strong>Loading Seiyuu Data...</strong>
          </div>
          <div p="10px" text="center #666">
            Fetching seiyuu information...
          </div>
        </div>,
        imageContainerRef.current,
      );
    }
  }, [loading]);

  // This component doesn't render anything directly - it manages DOM takeover
  return <CollageTableIntegration pageType="seiyuu" />;
}
