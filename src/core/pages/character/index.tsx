import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { CollageTableIntegration } from "@/core/features/collage-table/CollageTable";
import { useSettingsStore } from "@/lib/state/settings";
import { err, log } from "@/lib/utils/logging";
import { type AniListCharacterData, characterService, type MalCharacterData } from "@/services/character";

interface CharacterMetadata {
  source: "anilist" | "mal";
  data: AniListCharacterData | MalCharacterData;
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
 * Component that renders character image in sidebar
 */
function CharacterImageBox({
  characterData,
  originalImage,
}: {
  characterData: CharacterMetadata;
  originalImage: { src: string; alt: string; width: number } | null;
}) {
  const data =
    characterData.source === "mal"
      ? characterService.normalizeMalData(characterData.data as MalCharacterData)
      : (characterData.data as AniListCharacterData);

  const [showOriginal, setShowOriginal] = useState(false);
  const imageUrl = data.image.large;
  const nativeName = data.name.native;
  const alternativeNames = data.name.alternative;
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Use GM_addElement to bypass CSP restrictions for external images
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    // Clear existing content
    container.innerHTML = "";

    const currentImageUrl = showOriginal && originalImage ? originalImage.src : imageUrl;
    const currentAltText =
      showOriginal && originalImage ? originalImage.alt : nativeName || alternativeNames?.[0] || "Character";

    if (!currentImageUrl) return;

    try {
      // Create image using GM_addElement to bypass CSP
      GM_addElement(container, "img", {
        src: currentImageUrl,
        alt: currentAltText,
        class: "ab-character-cover-image",
      });

      log("Character image loaded successfully via GM_addElement");
    } catch (error) {
      err("Failed to load character image via GM_addElement", error);
      // Fallback to regular img tag if GM_addElement fails
      container.innerHTML = `<img src="${currentImageUrl}" alt="${currentAltText}" class="ab-character-cover-image" />`;
    }
  }, [imageUrl, nativeName, alternativeNames, showOriginal, originalImage]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="box">
      <div className="head">
        <strong>Character Image</strong>
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
        {alternativeNames && alternativeNames.length > 0 && <div>{alternativeNames.join(", ")}</div>}
      </div>
    </div>
  );
}

/**
 * Component that renders character description in main column
 */
function CharacterDescriptionBox({
  characterData,
  originalDescription,
}: {
  characterData: CharacterMetadata;
  originalDescription: string | null;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const data =
    characterData.source === "mal"
      ? characterService.normalizeMalData(characterData.data as MalCharacterData)
      : (characterData.data as AniListCharacterData);
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

  if (!data.description && !data.age && !data.gender && !data.bloodType && !data.dateOfBirth && !originalDescription) {
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
  const hasCharacterInfo = data.age || data.gender || data.bloodType || birthday;

  return (
    <div className="box">
      <div className="head">
        <strong>Character Information</strong>
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
            {hasCharacterInfo && (
              <div flex="col" justify="center" p="[8px_12px]">
                {birthday && (
                  <div>
                    <strong>Birthday:</strong> {birthday}
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
              </div>
            )}
            {data.description && (
              <div ref={descriptionRef} dangerouslySetInnerHTML={{ __html: `<p>${cleanDescription}</p>` }} />
            )}
          </>
        )}
        {!showOriginal && (
          <div mt="10px" text="12px #888" italic>
            Source: {characterData.source === "anilist" ? "AniList" : "MyAnimeList"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to access character page data from other components
 */
export function useCharacterPageData() {
  const [characterData, setCharacterData] = useState<CharacterMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacterData = async (characterName: string) => {
    setLoading(true);
    setError(null);

    try {
      const metadata = await characterService.fetchCharacterMetadata(characterName);
      if (metadata) {
        setCharacterData(metadata);
      } else {
        setError("No character data found");
      }
    } catch (error) {
      err("Failed to fetch character metadata", error);
      setError("Failed to fetch character data");
    } finally {
      setLoading(false);
    }
  };

  return {
    characterData,
    loading,
    error,
    fetchCharacterData,
  };
}

/**
 * Main integration component that handles DOM takeover for character pages
 */
export function CharacterPage() {
  const { characterPageEnhancements } = useSettingsStore();
  const [characterData, setCharacterData] = useState<CharacterMetadata | null>(null);
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

  // Check if we're on a character page
  const isCharacterPage = window.location.pathname.includes("/characters.php");

  useEffect(() => {
    if (!isCharacterPage || !characterPageEnhancements || isInitialized.current) {
      return;
    }

    const initializeIntegration = async () => {
      // Extract character name from page
      const titleElement = document.querySelector("#content h2");
      if (!titleElement || !titleElement.textContent) {
        return;
      }

      const characterName = titleElement.textContent.trim();
      log("Initializing character page integration for:", characterName);

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
        // imageContainer.className = "ab-character-cover-image-container";

        const descriptionContainer = document.createElement("div");
        // descriptionContainer.className = "ab-character-description-container";

        // Insert as first child in sidebar and main column
        sidebar.insertBefore(imageContainer, sidebar.firstChild);
        mainColumn.insertBefore(descriptionContainer, mainColumn.firstChild);

        // Store references
        imageContainerRef.current = imageContainer;
        descriptionContainerRef.current = descriptionContainer;

        isInitialized.current = true;

        // Fetch character data
        setLoading(true);
        const metadata = await characterService.fetchCharacterMetadata(characterName);
        if (metadata) {
          setCharacterData(metadata);
          log("Successfully fetched character metadata:", metadata);
        }
        setLoading(false);
      } catch (error) {
        err("Failed to initialize character page integration", error);
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
  }, [isCharacterPage, characterPageEnhancements]);

  // Render character image when data is available
  useEffect(() => {
    if (imageContainerRef.current && characterData && !loading) {
      render(
        <CharacterImageBox characterData={characterData} originalImage={originalContent.originalImage} />,
        imageContainerRef.current,
      );
    }
  }, [characterData, loading, originalContent.originalImage]);

  // Render character description when data is available
  useEffect(() => {
    if (descriptionContainerRef.current && characterData && !loading) {
      render(
        <CharacterDescriptionBox
          characterData={characterData}
          originalDescription={originalContent.originalDescription}
        />,
        descriptionContainerRef.current,
      );
    }
  }, [characterData, loading, originalContent.originalDescription]);

  // Render loading state
  useEffect(() => {
    if (loading && imageContainerRef.current && descriptionContainerRef.current) {
      render(
        <div className="box">
          <div className="head">
            <strong>Loading Character Data...</strong>
          </div>
          <div p="10px" text="center #666">
            Fetching character information...
          </div>
        </div>,
        imageContainerRef.current,
      );
    }
  }, [loading]);

  // This component doesn't render anything directly - it manages DOM takeover
  // Also render the collage table integration
  return <CollageTableIntegration pageType="character" />;
}
