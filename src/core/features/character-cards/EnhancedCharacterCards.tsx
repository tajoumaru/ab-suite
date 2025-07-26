import { useEffect, useRef, useState } from "preact/hooks";
import { err } from "@/lib/utils/logging";
import type { CharacterCardProps, EnhancedCharacterCardsProps } from "./types";

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
        const imgElement = GM_addElement(characterImageRef.current, "img", {
          src: character.image,
          alt: character.name,
          loading: "lazy",
          style: "width: 100%; height: 100%; object-fit: cover;",
        });

        // Add onerror handler after creation since GM_addElement doesn't support function properties
        if (imgElement) {
          imgElement.onerror = () => setImageError(true);
        }
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
        const imgElement = GM_addElement(vaImageRef.current, "img", {
          src: character.voiceActor.image,
          alt: character.voiceActor.name,
          loading: "lazy",
          style: "width: 100%; height: 100%; object-fit: cover;",
        });

        // Add onerror handler after creation since GM_addElement doesn't support function properties
        if (imgElement) {
          imgElement.onerror = () => setVaImageError(true);
        }
      } catch (error) {
        err("Failed to add voice actor image:", error);
        setVaImageError(true);
      }
    }
  }, [character.voiceActor?.image, vaImageError, character.voiceActor?.name]);

  return (
    <div
      inline-grid
      grid-areas="[character_staff]"
      grid-cols="[50%_50%]"
      bg="#2a2a2a"
      rounded="8px"
      overflow="hidden"
      border="1 solid #444"
      transition="transform, box-shadow"
      min-h="80px"
      data-role={character.role.toLowerCase()}
    >
      <div grid-area="[character]" inline-grid grid-areas="[image_content]" grid-cols="[60px_auto]" min-w="0">
        {characterLink ? (
          <a href={characterLink} block transition="opacity" rounded="2px" overflow="hidden" hover="opacity-80">
            <div
              grid-area="[image]"
              size-w-60px
              size-h-80px
              flex-shrink="0"
              overflow="hidden"
              flex
              items="center"
              justify="center"
              bg="#333"
              ref={characterImageRef}
            >
              {(!character.image || imageError) && (
                <div
                  size-w="full"
                  size-h="full"
                  flex
                  items="center"
                  justify="center"
                  bg="#444"
                  text="#888"
                  text-size="24px"
                  font="bold"
                >
                  <span>?</span>
                </div>
              )}
            </div>
          </a>
        ) : (
          <div
            grid-area="[image]"
            size-w-60px
            size-h-80px
            flex-shrink="0"
            overflow="hidden"
            flex
            items="center"
            justify="center"
            bg="#333"
            ref={characterImageRef}
          >
            {(!character.image || imageError) && (
              <div
                size-w="full"
                size-h="full"
                flex
                items="center"
                justify="center"
                bg="#444"
                text="#888"
                text-size="24px"
                font="bold"
              >
                <span>?</span>
              </div>
            )}
          </div>
        )}
        <div grid-area="[content]" p="[8px_12px]" flex="~ col" justify="center" min-w="0">
          <div font="bold" mb="4px" overflow="hidden" text="ellipsis" ws-nowrap>
            {characterLink ? <a href={characterLink}>{character.name}</a> : character.name}
          </div>
          <div
            text-size="12px"
            text-transform="capitalize"
            text={
              character.role.toLowerCase() === "main"
                ? "#4caf50"
                : character.role.toLowerCase() === "supporting"
                  ? "#ff9800"
                  : "#bbb"
            }
          >
            {character.role.charAt(0) + character.role.slice(1).toLowerCase()}
          </div>
        </div>
      </div>

      {character.voiceActor && (
        <div
          grid-area="[staff]"
          inline-grid
          grid-areas="[content_image]"
          grid-cols="[auto_60px]"
          border-l="1 solid #444"
          bg="#252525"
          min-w="0"
        >
          {voiceActorLink ? (
            <a href={voiceActorLink} block transition="opacity" rounded="2px" overflow="hidden" hover="opacity-80">
              <div
                grid-area="[image]"
                size-w-60px
                size-h-80px
                flex-shrink="0"
                overflow="hidden"
                flex
                items="center"
                justify="center"
                bg="#333"
                ref={vaImageRef}
              >
                {(!character.voiceActor.image || vaImageError) && (
                  <div
                    size-w="full"
                    size-h="full"
                    flex
                    items="center"
                    justify="center"
                    bg="#444"
                    text="#888"
                    text-size="24px"
                    font="bold"
                  >
                    <span>?</span>
                  </div>
                )}
              </div>
            </a>
          ) : (
            <div
              grid-area="[image]"
              size-w-60px
              size-h-80px
              flex-shrink="0"
              overflow="hidden"
              flex
              items="center"
              justify="center"
              bg="#333"
              ref={vaImageRef}
            >
              {(!character.voiceActor.image || vaImageError) && (
                <div
                  size-w="full"
                  size-h="full"
                  flex
                  items="center"
                  justify="center"
                  bg="#444"
                  text="#888"
                  text-size="24px"
                  font="bold"
                >
                  <span>?</span>
                </div>
              )}
            </div>
          )}
          <div grid-area="[content]" p="[8px_12px]" flex="~ col" justify="center" min-w="0" text-align="right">
            <div font="bold" mb="4px" overflow="hidden" text="ellipsis" ws-nowrap>
              {voiceActorLink ? <a href={voiceActorLink}>{character.voiceActor.name}</a> : character.voiceActor.name}
            </div>
            <div text-size="12px" text="#bbb">
              Japanese
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced character cards component - pure UI component that receives processed data
 */
export function EnhancedCharacterCards({
  characters,
  originalContent,
  showToggle = true,
}: EnhancedCharacterCardsProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Limit to first 6 characters initially
  const displayedCharacters = showAll ? characters : characters.slice(0, 6);

  const toggleContent = () => {
    setShowOriginal(!showOriginal);
  };

  return (
    <div className="box" mb="20px" data-ab-section="characters">
      <div justify="between" items="center" flex="~ wrap" gap="10px" className="head">
        <strong>
          <a href="#characters" id="characters">
            Characters
          </a>
        </strong>
        <span items="center" flex="~ wrap" gap="10px">
          {showToggle && originalContent && (
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
              {showOriginal ? "Show Cards" : "Show Original"}
            </button>
          )}
        </span>
      </div>

      <div className="body" p={showOriginal ? "10px" : "0"}>
        {showOriginal ? (
          <div dangerouslySetInnerHTML={{ __html: originalContent || "" }} />
        ) : (
          <>
            <div grid grid-cols="[repeat(3,1fr)]" gap-x="16px" gap-y="8px" p="12px">
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
              <div text-align="center" mb="10px">
                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  cursor="pointer"
                  bg="[none]"
                  border="none"
                  text="#007bff decoration-none 12px"
                >
                  {showAll ? "(show less)" : `(show all ${characters.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
