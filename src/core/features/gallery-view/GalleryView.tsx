import { useEffect, useRef, useState } from "preact/hooks";
import { DescriptionRenderer } from "@/core/features/descriptions/DescriptionRenderer";
import { useDescriptionStore } from "@/core/shared/descriptions";
import { useSettingsStore } from "@/lib/state/settings";
import { err, log } from "@/lib/utils/logging";
import { formatTagName, getTagStyle } from "@/utils/tags";

interface GalleryItem {
  id: string;
  title: string;
  coverImageUrl: string;
  torrentPageUrl: string;
  tags: string[];
  description: string;
}

interface GalleryViewProps {
  className?: string;
}

function extractGalleryItems(): GalleryItem[] {
  const items: GalleryItem[] = [];
  const torrentGroups = document.querySelectorAll("div.group_cont.box");

  // Create a document fragment and reusable div for HTML decoding to batch DOM operations
  const fragment = document.createDocumentFragment();
  const tempDiv = document.createElement("div");
  fragment.appendChild(tempDiv);

  torrentGroups.forEach((groupDiv, index) => {
    try {
      const coverImgElement = groupDiv.querySelector("div.group_img span.mainimg a img") as HTMLImageElement;
      let coverImageUrl = coverImgElement?.src || null;

      const torrentLinkElement = groupDiv.querySelector("div.group_img span.mainimg a") as HTMLAnchorElement;
      const torrentPageUrl = torrentLinkElement ? new URL(torrentLinkElement.href, window.location.origin).href : "#";

      let torrentTitle = "Untitled";
      if (coverImgElement) {
        torrentTitle = coverImgElement.alt || coverImgElement.title || "Untitled";
      }
      if (torrentTitle === "Untitled" || torrentTitle.trim() === "") {
        const titleStrongAElement = groupDiv.querySelector(
          "div.group_main span.group_title strong a",
        ) as HTMLAnchorElement;
        if (titleStrongAElement) torrentTitle = titleStrongAElement.textContent?.trim() || "Untitled";
      }

      // Reuse the batched tempDiv for HTML decoding
      tempDiv.innerHTML = torrentTitle;
      torrentTitle = tempDiv.textContent || tempDiv.innerText || "Untitled";

      if (!coverImageUrl) {
        coverImageUrl = `https://placehold.co/240x375/282828/555555?text=${encodeURIComponent(torrentTitle.substring(0, 10))}`;
      } else if (coverImageUrl.includes("static/common/noartwork")) {
        coverImageUrl = `https://placehold.co/240x375/282828/555555?text=No+Cover`;
      } else if (coverImageUrl && !coverImageUrl.startsWith("http")) {
        coverImageUrl = new URL(coverImageUrl, window.location.origin).href;
      }

      const tagsContainer = groupDiv.querySelector("div.tags_sm div.tags");
      const tags: string[] = [];
      if (tagsContainer) {
        const tagLinks = tagsContainer.querySelectorAll("a");
        tags.push(
          ...Array.from(tagLinks)
            .map((a) => a.textContent?.trim().toLowerCase() || "")
            .slice(0, 4),
        );
      }

      const descriptionElement = groupDiv.querySelector("div.torrent_desc");
      const description = descriptionElement?.innerHTML.trim() || "No description available.";

      items.push({
        id: `gallery-item-${index}`,
        title: torrentTitle,
        coverImageUrl,
        torrentPageUrl,
        tags,
        description,
      });
    } catch (error) {
      err("AB Suite Gallery: Error processing torrent group", error);
    }
  });

  return items;
}

function GalleryItem({ item }: { item: GalleryItem }) {
  const { enhancedTagStylingEnabled } = useSettingsStore(["enhancedTagStylingEnabled"]);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const fallbackImageUrl = imageError
    ? `https://placehold.co/240x375/333333/777777?text=Load+Error`
    : item.coverImageUrl;

  return (
    <div
      size-w-240px
      bg="#282828"
      rounded="8px"
      shadow="[0_4px_12px_rgba(0,0,0,0.4)]"
      transition="transform-out, box-shadow-out"
      flex="~ col"
      position="relative"
      overflow="hidden"
      hover="shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
      className="group ab-gallery-item"
    >
      <a
        href={item.torrentPageUrl}
        title={item.title}
        text-color="inherit"
        un-decoration="none"
        flex="~ col"
        position="relative z-2"
        className="ab-gallery-item-clickable-area"
      >
        <img
          src={fallbackImageUrl}
          alt={item.title}
          size-w="full"
          size-h-375px
          un-object="cover"
          block
          bg="#333"
          onError={handleImageError}
        />
        <div
          p="[10px_8px]"
          bg="[rgba(0,0,0,0.6)]"
          text="white center 0.9em"
          min-h="55px"
          flex
          items="center"
          justify="center"
          box="border"
        >
          <span line-clamp="̛3" overflow="hidden" text="ellipsis" line-height="[1.3]">
            {item.title}
          </span>
        </div>
      </a>
      <div
        p="[8px_8px_4px_8px]"
        text-align="center"
        bg="#303030"
        border-t="1 solid #444"
        min-h="28px"
        size-h="full"
        position="relative z-1"
      >
        {item.tags.length > 0 ? (
          item.tags.map((tag) => (
            <span
              key={tag}
              inline-block
              bg="#4a5568"
              text="#e2e8f0 capitalize 0.78em"
              p="[3px_7px]"
              m="2px"
              rounded="4px"
              line-height="[1.2]"
              style={enhancedTagStylingEnabled ? getTagStyle(tag) : {}}
            >
              {enhancedTagStylingEnabled ? formatTagName(tag) : tag}
            </span>
          ))
        ) : (
          <span>No tags</span>
        )}
      </div>
      <div
        position="absolute bottom-0 left-0 right-0 z-3"
        op="0"
        invisible
        transition="custom-opacity_0.25s_ease-out/translate_0.25s_ease-out/visibility_0s_linear_delay-0.25s"
        translate-y="full"
        group-hover="translate-y-0 visible op-100 delay-[.1s,.1s,.1s]"
        bg="[rgba(25,25,25,0.97)]"
        text="#e8e8e8"
        p="12px"
        box="border"
        max-h="75%"
        overflow-y="auto"
        text-size="0.82em"
        line-height="[1.45]"
        border-t="1 solid #555"
      >
        <div className="torrent_desc" data-torrent-link={item.torrentPageUrl}>
          <DescriptionRenderer torrentLink={item.torrentPageUrl} />
        </div>
      </div>
    </div>
  );
}

export function GalleryView({ className }: GalleryViewProps) {
  const { galleryViewEnabled } = useSettingsStore(["galleryViewEnabled"]);
  const descriptionStore = useDescriptionStore();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!galleryViewEnabled) return;

    // Only run on torrent pages
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    const items = extractGalleryItems();

    // Initialize descriptions in the store
    items.forEach((item) => {
      descriptionStore.initializeDescription(item.torrentPageUrl, item.description);
    });

    setGalleryItems(items);

    // Load saved view state
    const savedState = localStorage.getItem("animebytesGalleryViewActive_v1");
    setIsActive(savedState === "true");

    log("AB Suite Gallery: Initialized with", items.length, "items");
  }, [galleryViewEnabled]);

  useEffect(() => {
    if (!galleryViewEnabled) return;

    const originalGroups = document.querySelectorAll("div.group_cont.box");
    const contentDiv = document.getElementById("content");

    if (isActive) {
      originalGroups.forEach((group) => {
        (group as HTMLElement).style.display = "none";
      });
      contentDiv?.classList.add("ab-gallery-content-wrapper-active");

      // Trigger ReadMore integration for gallery view descriptions
      // Use a small timeout to ensure the DOM is updated
      setTimeout(() => {
        const event = new CustomEvent("ab-gallery-view-changed", { detail: { active: true } });
        document.dispatchEvent(event);
      }, 50);
    } else {
      originalGroups.forEach((group) => {
        (group as HTMLElement).style.display = "";
      });
      contentDiv?.classList.remove("ab-gallery-content-wrapper-active");

      // Trigger ReadMore integration for regular view descriptions
      setTimeout(() => {
        const event = new CustomEvent("ab-gallery-view-changed", { detail: { active: false } });
        document.dispatchEvent(event);
      }, 50);
    }
  }, [isActive, galleryViewEnabled]);

  const toggleView = () => {
    const newState = !isActive;
    setIsActive(newState);
    localStorage.setItem("animebytesGalleryViewActive_v1", newState.toString());
  };

  if (!galleryViewEnabled || galleryItems.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <button
        id="ab-gallery-toggle-button"
        onClick={toggleView}
        block
        m="[15px_auto_20px]"
        p="[10px_20px]"
        text="white 1em"
        bg="#4a5568"
        border="none rd-6px"
        cursor="pointer"
        transition="background-color-in-out"
        hover="bg-[#2d3748]"
        type="button"
      >
        {isActive ? "Show Original View" : "Show Gallery View"}
      </button>

      <div
        ref={containerRef}
        className={isActive ? "flex" : "hidden"}
        flex="wrap"
        gap="25px"
        p="20px"
        justify="center"
        max-w="full"
      >
        {galleryItems.map((item) => (
          <GalleryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
