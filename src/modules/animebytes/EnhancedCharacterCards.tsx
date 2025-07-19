import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { AniListMediaData } from "@/services/anilist";
import { aniListService } from "@/services/anilist";
import { findAllMatches } from "@/utils/fuzzyMatch";
import { err, log } from "@/utils/logging";

// Global integration tracking to prevent double integration
let globalCharacterCardsIntegrated = false;

interface OriginalCharacterEntry {
  characterName: string;
  characterLink: string;
  seiyuuName: string;
  seiyuuLink: string;
}

/**
 * Parse the original character table HTML to extract character and seiyuu links
 */
function parseOriginalCharacterTable(html: string): OriginalCharacterEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("tr");
  const entries: OriginalCharacterEntry[] = [];

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 4) {
      const characterCell = cells[0];
      const seiyuuCell = cells[2];

      const characterLink = characterCell.querySelector("a");
      const seiyuuLink = seiyuuCell.querySelector("a");

      if (characterLink && seiyuuLink) {
        entries.push({
          characterName: characterLink.textContent?.trim() || "",
          characterLink: characterLink.getAttribute("href") || "",
          seiyuuName: seiyuuLink.textContent?.trim() || "",
          seiyuuLink: seiyuuLink.getAttribute("href") || "",
        });
      }
    }
  }

  return entries;
}

/**
 * Find the best character match using main name and all alternative names
 */
function findBestCharacterMatch(
  character: { name: string; alternativeNames: string[] },
  candidates: Array<{ name: string; link: string }>,
): { match: { name: string; link: string } | null; score: number } {
  // Try main name first
  const mainNameMatches = findAllMatches(character.name, candidates, 0.3);

  // Try all alternative names
  const alternativeMatches = character.alternativeNames.flatMap((altName) => findAllMatches(altName, candidates, 0.3));

  // Combine all matches and find the best one
  const allMatches = [...mainNameMatches, ...alternativeMatches];

  if (allMatches.length === 0) {
    return { match: null, score: 0 };
  }

  // Sort by score and return the best match
  allMatches.sort((a, b) => b.score - a.score);
  return { match: allMatches[0].candidate, score: allMatches[0].score };
}

interface EnhancedCharacterCardsProps {
  aniListData: AniListMediaData;
  originalContent?: string;
}

interface CharacterCardProps {
  character: {
    name: string;
    role: string;
    image: string | null;
    voiceActor: {
      name: string;
      image: string | null;
    } | null;
  };
  characterLink?: string;
  voiceActorLink?: string;
}

/**
 * Individual character card component
 */
function CharacterCard({ character, characterLink, voiceActorLink }: CharacterCardProps) {
  const [imageError, setImageError] = useState(false);
  const [vaImageError, setVaImageError] = useState(false);

  const characterImageRef = useRef<HTMLDivElement>(null);
  const vaImageRef = useRef<HTMLDivElement>(null);

  // Use GM_addElement for images to bypass CSP
  useEffect(() => {
    if (character.image && !imageError && characterImageRef.current) {
      // Clear existing content
      characterImageRef.current.innerHTML = "";

      // Add image using GM_addElement
      try {
        GM_addElement(characterImageRef.current, "img", {
          src: character.image,
          alt: character.name,
          loading: "lazy",
          style: "width: 100%; height: 100%; object-fit: cover;",
          onerror: () => setImageError(true),
        });
      } catch (error) {
        err("Failed to add character image:", error);
        setImageError(true);
      }
    }
  }, [character.image, imageError, character.name]);

  useEffect(() => {
    if (character.voiceActor?.image && !vaImageError && vaImageRef.current) {
      // Clear existing content
      vaImageRef.current.innerHTML = "";

      // Add image using GM_addElement
      try {
        GM_addElement(vaImageRef.current, "img", {
          src: character.voiceActor.image,
          alt: character.voiceActor.name,
          loading: "lazy",
          style: "width: 100%; height: 100%; object-fit: cover;",
          onerror: () => setVaImageError(true),
        });
      } catch (error) {
        err("Failed to add voice actor image:", error);
        setVaImageError(true);
      }
    }
  }, [character.voiceActor?.image, vaImageError, character.voiceActor?.name]);

  return (
    <div className="ab-character-card" data-role={character.role.toLowerCase()}>
      <div className="ab-character-section">
        {characterLink ? (
          <a href={characterLink} className="ab-character-image-link">
            <div className="ab-character-image" ref={characterImageRef}>
              {(!character.image || imageError) && (
                <div className="ab-character-placeholder">
                  <span>?</span>
                </div>
              )}
            </div>
          </a>
        ) : (
          <div className="ab-character-image" ref={characterImageRef}>
            {(!character.image || imageError) && (
              <div className="ab-character-placeholder">
                <span>?</span>
              </div>
            )}
          </div>
        )}
        <div className="ab-character-info">
          <div className="ab-character-name">
            {characterLink ? <a href={characterLink}>{character.name}</a> : character.name}
          </div>
          <div className="ab-character-role">{character.role.charAt(0) + character.role.slice(1).toLowerCase()}</div>
        </div>
      </div>

      {character.voiceActor && (
        <div className="ab-voice-actor-section">
          {voiceActorLink ? (
            <a href={voiceActorLink} className="ab-voice-actor-image-link">
              <div className="ab-voice-actor-image" ref={vaImageRef}>
                {(!character.voiceActor.image || vaImageError) && (
                  <div className="ab-voice-actor-placeholder">
                    <span>?</span>
                  </div>
                )}
              </div>
            </a>
          ) : (
            <div className="ab-voice-actor-image" ref={vaImageRef}>
              {(!character.voiceActor.image || vaImageError) && (
                <div className="ab-voice-actor-placeholder">
                  <span>?</span>
                </div>
              )}
            </div>
          )}
          <div className="ab-voice-actor-info">
            <div className="ab-voice-actor-name">
              {voiceActorLink ? <a href={voiceActorLink}>{character.voiceActor.name}</a> : character.voiceActor.name}
            </div>
            <div className="ab-voice-actor-role">Japanese</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced character cards component that replaces the original character listing
 * with AniList-style character cards
 */
export function EnhancedCharacterCards({ aniListData, originalContent }: EnhancedCharacterCardsProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Get main characters from AniList data
  const characters = aniListService.getMainCharacters(aniListData.characters);

  // Parse original character table to extract links
  const originalEntries = originalContent ? parseOriginalCharacterTable(originalContent) : [];

  // Create lookup arrays for matching
  const characterCandidates = originalEntries.map((entry) => ({
    name: entry.characterName,
    link: entry.characterLink,
  }));

  const seiyuuCandidates = originalEntries.map((entry) => ({
    name: entry.seiyuuName,
    link: entry.seiyuuLink,
  }));

  // Step 1: Find all potential character matches (including alternative names)
  const characterMatches = characters.map((character, index) => {
    const match = findBestCharacterMatch(character, characterCandidates);

    return {
      characterIndex: index,
      match: match.match,
      score: match.score,
    };
  });

  // Step 2: Find all potential voice actor matches (separate from characters)
  const voiceActorMatches = characters.map((character, index) => {
    if (!character.voiceActor) {
      return { characterIndex: index, match: null, score: 0 };
    }

    const matches = findAllMatches(character.voiceActor.name, seiyuuCandidates, 0.3);
    const bestMatch = matches.length > 0 ? matches[0] : null;

    return {
      characterIndex: index,
      match: bestMatch?.candidate || null,
      score: bestMatch?.score || 0,
    };
  });

  // Step 3: Resolve conflicts for character links
  const characterLinkAssignments = new Map<string, number>(); // link -> character index

  // Sort character matches by score and assign greedily
  const sortedCharacterMatches = characterMatches
    .filter((m) => m.match && m.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  for (const match of sortedCharacterMatches) {
    if (!match.match) continue;
    const link = match.match.link;
    if (!characterLinkAssignments.has(link)) {
      characterLinkAssignments.set(link, match.characterIndex);
    }
  }

  // Step 4: Resolve conflicts for voice actor links
  const voiceActorLinkAssignments = new Map<string, number>(); // link -> character index

  // Sort voice actor matches by score and assign greedily (only high-scoring matches)
  const sortedVoiceActorMatches = voiceActorMatches
    .filter((m) => m.match && m.score >= 0.8) // Strict threshold for voice actors
    .sort((a, b) => b.score - a.score);

  for (const match of sortedVoiceActorMatches) {
    if (!match.match) continue;
    const link = match.match.link;
    if (!voiceActorLinkAssignments.has(link)) {
      voiceActorLinkAssignments.set(link, match.characterIndex);
    }
  }

  // Step 5: Build final character list with links
  const charactersWithLinks = characters.map((character, index) => {
    const characterLink = Array.from(characterLinkAssignments.entries()).find(
      ([_link, charIndex]) => charIndex === index,
    )?.[0];

    const voiceActorLink = Array.from(voiceActorLinkAssignments.entries()).find(
      ([_link, charIndex]) => charIndex === index,
    )?.[0];

    return {
      character,
      characterLink,
      voiceActorLink,
    };
  });

  // Limit to first 6 characters initially
  const displayedCharacters = showAll ? charactersWithLinks : charactersWithLinks.slice(0, 6);

  log("EnhancedCharacterCards render:", {
    hasOriginalContent: !!originalContent,
    originalContentLength: originalContent?.length || 0,
    originalEntriesCount: originalEntries.length,
    showOriginal,
    selectedContent: showOriginal ? "original" : "enhanced",
    showAll,
    totalCharacters: characters.length,
    displayedCharacters: displayedCharacters.length,
    originalContentPreview: `${originalContent?.substring(0, 100)}...`,
  });

  const toggleContent = () => {
    log("CharacterCards toggle clicked, current showOriginal:", showOriginal);
    setShowOriginal(!showOriginal);
    log("CharacterCards toggle new state will be:", !showOriginal);
  };

  return (
    <div className="box ab-enhanced-character-cards" data-ab-section="characters">
      <div className="head ab-character-cards-header">
        <strong>
          <a href="#characters" id="characters">
            Characters
          </a>
        </strong>
        <span className="ab-character-controls">
          {originalContent && (
            <button type="button" onClick={toggleContent} className="ab-toggle-button">
              {showOriginal ? "Show Cards" : "Show Original"}
            </button>
          )}
        </span>
      </div>

      <div
        className={`body ab-character-cards-body ${showOriginal ? "ab-character-cards-body-padded" : "ab-character-cards-body-no-padding"}`}
      >
        {showOriginal ? (
          <div className="ab-original-content" dangerouslySetInnerHTML={{ __html: originalContent || "" }} />
        ) : (
          <>
            <div className="ab-character-grid">
              {displayedCharacters.map((item) => (
                <CharacterCard
                  key={item.character.name}
                  character={item.character}
                  characterLink={item.characterLink}
                  voiceActorLink={item.voiceActorLink}
                />
              ))}
            </div>
            {characters.length > 6 && (
              <div className="ab-character-show-all-container">
                <button type="button" onClick={() => setShowAll(!showAll)} className="ab-character-show-all-toggle">
                  {showAll ? "(show less)" : `(show all ${charactersWithLinks.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage enhanced character cards integration
 */
export function useEnhancedCharacterCards(aniListData: AniListMediaData | null) {
  const [isIntegrated, setIsIntegrated] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  // Memoize the data to prevent unnecessary re-runs
  const memoizedData = useMemo(() => {
    if (!aniListData) return null;
    return {
      title: aniListData.title?.romaji,
      charactersCount: aniListData.characters?.edges?.length || 0,
      hasCharacters: (aniListData.characters?.edges?.length || 0) > 0,
    };
  }, [aniListData?.title?.romaji, aniListData?.characters?.edges?.length]);

  // Only log when state changes
  useEffect(() => {
    if (memoizedData || isIntegrated) {
      log("useEnhancedCharacterCards called:", {
        hasAniListData: !!memoizedData,
        isIntegrated,
        title: memoizedData?.title,
        charactersCount: memoizedData?.charactersCount || 0,
      });
    }
  }, [memoizedData, isIntegrated]);

  useEffect(() => {
    if (!memoizedData) {
      return;
    }

    if (isIntegrated || globalCharacterCardsIntegrated) {
      log("useEnhancedCharacterCards: Already integrated, skipping");
      return;
    }

    log("useEnhancedCharacterCards: Starting integration");

    const integrateCharacterCards = () => {
      log(
        "integrateCharacterCards called, isIntegrated:",
        isIntegrated,
        "globalIntegrated:",
        globalCharacterCardsIntegrated,
      );

      // If already integrated globally, skip
      if (globalCharacterCardsIntegrated) {
        log("CharacterCards already integrated globally, skipping");
        return;
      }

      // If already integrated locally, skip
      if (isIntegrated) {
        log("CharacterCards already integrated locally, skipping");
        return;
      }

      // Find the existing character listing box
      const boxes = document.querySelectorAll(".box:not([data-ab-enhanced-character-cards])");
      let characterElement: HTMLElement | null = null;

      log("Looking for Character listing box, found boxes:", boxes.length);

      // Look for the box with "Character and Seiyuu Listing" header
      for (const box of boxes) {
        const headerElement = box.querySelector(".head strong a");
        const headerText = headerElement?.textContent;
        log("Checking box with header:", headerText);
        if (headerText?.includes("Character and Seiyuu Listing")) {
          characterElement = box as HTMLElement;
          log("Found Character listing box");
          break;
        }
      }

      if (!characterElement) {
        log("No Character listing element found");
        return;
      }

      // Extract original content
      const bodyElement = characterElement.querySelector(".body") as HTMLElement;
      const originalContent = bodyElement ? bodyElement.innerHTML : "";

      log("Extracting original character cards content:", {
        hasBodyElement: !!bodyElement,
        originalContentLength: originalContent.length,
        originalContentPreview: `${originalContent.substring(0, 100)}...`,
      });

      // Mark as processed BEFORE making changes
      characterElement.setAttribute("data-ab-enhanced-character-cards", "true");

      // Disconnect observer before DOM manipulation
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Hide the original character listing box
      characterElement.style.display = "none";

      // Find the character placeholder and insert character cards there
      const charactersPlaceholder = document.querySelector("#ab-characters-placeholder");
      const container = document.createElement("div");

      log("Positioning character cards in placeholder:", {
        hasCharactersPlaceholder: !!charactersPlaceholder,
        containerCreated: !!container,
      });

      if (charactersPlaceholder) {
        // Replace the placeholder with character cards container
        charactersPlaceholder.parentNode?.replaceChild(container, charactersPlaceholder);
        log("Character cards container replaced placeholder");
      } else {
        // Fallback: replace in original position if placeholder not found
        const parent = characterElement.parentNode;
        if (parent) {
          parent.replaceChild(container, characterElement);
          log("Character cards element replaced with container (fallback)");
        }
      }

      // Render the enhanced character cards
      import("preact").then(({ render }) => {
        log("Rendering enhanced character cards");
        if (aniListData) {
          render(<EnhancedCharacterCards aniListData={aniListData} originalContent={originalContent} />, container);
        }
        log("Enhanced character cards rendered successfully");
      });

      setIsIntegrated(true);
      globalCharacterCardsIntegrated = true;
      log("Enhanced character cards integrated successfully");
    };

    // Try to integrate immediately
    integrateCharacterCards();

    // Only set up observer if not integrated
    if (!isIntegrated) {
      // Watch for dynamic content changes
      const observer = new MutationObserver((mutations) => {
        // Check if any mutations added a character listing box
        const hasNewCharacterBox = mutations.some((mutation) => {
          return Array.from(mutation.addedNodes).some((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const element = node as Element;
            const anchor = element.querySelector?.(".box .head strong a");
            return (
              anchor?.textContent?.includes("Character and Seiyuu Listing") ||
              (element.classList?.contains("box") &&
                element.querySelector(".head strong a")?.textContent?.includes("Character and Seiyuu Listing"))
            );
          });
        });

        if (hasNewCharacterBox) {
          integrateCharacterCards();
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
