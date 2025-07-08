import { useEffect, useRef, useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";

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

const tagColors: Record<string, string | { background: string; color?: string; border?: string }> = {
  action: "#FF6347",
  adventure: { background: "#FFD700", color: "#333333" },
  classic: "#D2B48C",
  comedy: { background: "#90EE90", color: "#333333" },
  "contemporary.fantasy": "#DA70D6",
  drama: "#4682B4",
  ecchi: { background: "#FFB6C1", color: "#333333" },
  fantasy: "#8A2BE2",
  fighting: "#B22222",
  "gender.bender": "#FF69B4",
  harem: { background: "#FFA07A", color: "#333333" },
  historical: "#8B4513",
  isekai: "#20B2AA",
  "love.polygon": { background: "#FFC0CB", color: "#333333" },
  magic: "#9370DB",
  "mahou.shoujo": "#DB7093",
  mecha: "#708090",
  military: "#556B2F",
  music: "#1E90FF",
  mystery: { background: "#4B0082", color: "#FFFFFF" },
  new: { background: "#FFFFFF", color: "#333333", border: "1px solid #ccc" },
  "piloted.robot": "#607D8B",
  psychological: { background: "#2F4F4F", color: "#FFFFFF" },
  romance: "#FF1493",
  "school.life": { background: "#87CEEB", color: "#333333" },
  "science.fiction": "#00CED1",
  seinen: "#696969",
  shoujo: { background: "#FFDAE9", color: "#333333" },
  shounen: "#FFA500",
  "shounen.ai": { background: "#ADD8E6", color: "#333333" },
  slapstick: { background: "#FFFFE0", color: "#555555" },
  "slice.of.life": { background: "#98FB98", color: "#333333" },
  steampunk: "#CD853F",
  "super.power": "#DC143C",
  supernatural: { background: "#483D8B", color: "#FFFFFF" },
  thriller: { background: "#1A1A1A", color: "#FFFFFF" },
  underworld: { background: "#333333", color: "#FFFFFF" },
  violence: "#8B0000",
  yaoi: { background: "#AFEEEE", color: "#333333" },
  yuri: { background: "#F08080", color: "#333333" },
};

function extractGalleryItems(): GalleryItem[] {
  const items: GalleryItem[] = [];
  const torrentGroups = document.querySelectorAll("div.group_cont.box");

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

      const tempDiv = document.createElement("div");
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
      console.error("AB Suite Gallery: Error processing torrent group", error);
    }
  });

  return items;
}

function GalleryItem({ item }: { item: GalleryItem }) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const getTagStyle = (tag: string) => {
    const colorStyle = tagColors[tag];
    if (typeof colorStyle === "object") {
      return {
        backgroundColor: colorStyle.background,
        color: colorStyle.color || "#e2e8f0",
        border: colorStyle.border || "none",
      };
    } else if (typeof colorStyle === "string") {
      return {
        backgroundColor: colorStyle,
        color: "#e2e8f0",
      };
    }
    return {
      backgroundColor: "#4a5568",
      color: "#e2e8f0",
    };
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
            <span key={tag} className="ab-gallery-tag" style={getTagStyle(tag)}>
              {tag.replace(/\./g, " ")}
            </span>
          ))
        ) : (
          <span style={{ fontSize: "0.8em", color: "#777" }}>No tags</span>
        )}
      </div>
      <div className="ab-gallery-description-on-hover">
        <div dangerouslySetInnerHTML={{ __html: item.description }} />
      </div>
    </div>
  );
}

export function GalleryView({ className }: GalleryViewProps) {
  const { galleryViewEnabled } = useSettingsStore();
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
    } else {
      originalGroups.forEach((group) => {
        (group as HTMLElement).style.display = "";
      });
      contentDiv?.classList.remove("ab-gallery-content-wrapper-active");
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

      <div ref={containerRef} className="ab-gallery-container" style={{ display: isActive ? "flex" : "none" }}>
        {galleryItems.map((item) => (
          <GalleryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
