import { useEffect, useState } from "preact/hooks";
import { useSettingsStore } from "@/lib/state/settings";
import { log } from "@/lib/utils/logging";
import { formatTagName, getTagStyle } from "@/utils/tags";

interface TagCloudTag {
  name: string;
  level: number;
  href: string;
  originalText: string;
}

interface TagCloudProps {
  className?: string;
}

function extractTagCloudData(): TagCloudTag[] {
  const tagCloudContainer = document.getElementById("browse_nav_tags");
  if (!tagCloudContainer) return [];

  const tagElements = tagCloudContainer.querySelectorAll("a.tag_cloud");
  const tags: TagCloudTag[] = [];

  tagElements.forEach((element) => {
    const anchor = element as HTMLAnchorElement;
    const classList = Array.from(anchor.classList);
    const levelClass = classList.find((cls) => cls.startsWith("level_"));
    const level = levelClass ? parseInt(levelClass.replace("level_", "")) : 1;

    tags.push({
      name: anchor.textContent?.trim() || "",
      level,
      href: anchor.href,
      originalText: anchor.textContent?.trim() || "",
    });
  });

  return tags;
}

function TagCloudItem({ tag }: { tag: TagCloudTag }) {
  const { enhancedTagStylingEnabled } = useSettingsStore(["enhancedTagStylingEnabled"]);

  const displayText = enhancedTagStylingEnabled ? formatTagName(tag.name) : tag.originalText;
  const style = enhancedTagStylingEnabled ? getTagStyle(tag.name.toLowerCase()) : {};

  return (
    <a
      href={tag.href}
      inline-block
      p={
        tag.level === 5
          ? "5px 14px"
          : tag.level === 4
            ? "4px 13px"
            : tag.level === 3
              ? "4px 12px"
              : tag.level === 2
                ? "3px 11px"
                : "3px 10px"
      }
      m="2px"
      rounded="6px"
      un-decoration="none"
      text-size={
        tag.level === 5
          ? "1.3em"
          : tag.level === 4
            ? "1.2em"
            : tag.level === 3
              ? "1.1em"
              : tag.level === 2
                ? "1em"
                : "0.9em"
      }
      font={tag.level >= 4 ? "600" : tag.level >= 2 ? "500" : "400"}
      line-height="[1.4]"
      transition="all"
      un-ws="nowrap"
      hover="shadow-[0_3px_8px_rgba(0,0,0,0.3)] decoration-none"
      style={style}
      data-level={tag.level}
    >
      {displayText}
    </a>
  );
}

export function TagCloud({ className }: TagCloudProps) {
  const { enhancedTagStylingEnabled } = useSettingsStore(["enhancedTagStylingEnabled"]);
  const [tags, setTags] = useState<TagCloudTag[]>([]);
  const [isReplaced, setIsReplaced] = useState(false);

  useEffect(() => {
    if (!enhancedTagStylingEnabled) {
      // Show original tag cloud
      const originalTagCloud = document.getElementById("browse_nav_tags");
      if (originalTagCloud && isReplaced) {
        originalTagCloud.style.display = "";
        setIsReplaced(false);
      }
      return;
    }

    // Extract tag data
    const tagData = extractTagCloudData();
    if (tagData.length === 0) return;

    // Sort tags by level (higher level first), then alphabetically
    const sortedTags = tagData.sort((a, b) => {
      if (a.level !== b.level) {
        return b.level - a.level; // Higher level first (level_5 before level_1)
      }
      return a.name.localeCompare(b.name); // Alphabetical within same level
    });

    setTags(sortedTags);

    // Hide original tag cloud
    const originalTagCloud = document.getElementById("browse_nav_tags");
    if (originalTagCloud) {
      originalTagCloud.style.display = "none";
      setIsReplaced(true);
    }

    log("TagCloud initialized with", sortedTags.length, "tags");
  }, [enhancedTagStylingEnabled]);

  // Don't render if enhanced styling is disabled or no tags
  if (!enhancedTagStylingEnabled || tags.length === 0) {
    return null;
  }

  return (
    <div id="ab-browse-nav-tags" flex="~ wrap" gap="6px" items="center" line-height="[1.6]" className={className || ""}>
      {tags.map((tag) => (
        <TagCloudItem key={tag.name} tag={tag} />
      ))}
    </div>
  );
}
