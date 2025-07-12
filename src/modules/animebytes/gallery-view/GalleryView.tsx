import { useEffect, useRef, useState } from "preact/hooks";
import { useDescriptionStore } from "@/stores/descriptions";
import { useSettingsStore } from "@/stores/settings";
import { err, log } from "@/utils/logging";
import { formatTagName, getTagStyle } from "@/utils/tags";
import { DescriptionRenderer } from "../DescriptionRenderer";

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
    <div className="ab-gallery-item">
      <a href={item.torrentPageUrl} title={item.title} className="ab-gallery-item-clickable-area">
        <img src={fallbackImageUrl} alt={item.title} className="ab-gallery-cover-image" onError={handleImageError} />
        <div className="ab-gallery-title-container">
          <span className="ab-gallery-title-text">{item.title}</span>
        </div>
      </a>
      <div className="ab-gallery-tags-container">
        {item.tags.length > 0 ? (
          item.tags.map((tag) => (
            <span key={tag} className="ab-gallery-tag" style={enhancedTagStylingEnabled ? getTagStyle(tag) : {}}>
              {enhancedTagStylingEnabled ? formatTagName(tag) : tag}
            </span>
          ))
        ) : (
          <span className="ab-gallery-no-tags">No tags</span>
        )}
      </div>
      <div className="ab-gallery-description-on-hover">
        <DescriptionRenderer torrentLink={item.torrentPageUrl} className="torrent_desc" />
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
      <button id="ab-gallery-toggle-button" onClick={toggleView} className="ab-gallery-toggle-button" type="button">
        {isActive ? "Show Original View" : "Show Gallery View"}
      </button>

      <div
        ref={containerRef}
        className={`ab-gallery-container ${isActive ? "ab-gallery-display-control" : "ab-gallery-display-none"}`}
      >
        {galleryItems.map((item) => (
          <GalleryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
