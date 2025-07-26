import { render } from "preact";
import type { ReactNode } from "preact/compat";

export const tagColors: Record<string, string | { background: string; color?: string; border?: string }> = {
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
  horror: "#B22222",
  isekai: "#20B2AA",
  josei: "#FFB6C1",
  "love.polygon": { background: "#FFC0CB", color: "#333333" },
  magic: "#9370DB",
  "mahou.shoujo": "#DB7093",
  manga: "#8B7355",
  "martial.arts": "#B22222",
  mecha: "#708090",
  medical: "#48D1CC",
  military: "#556B2F",
  music: "#1E90FF",
  mystery: { background: "#4B0082", color: "#FFFFFF" },
  new: { background: "#FFFFFF", color: "#333333", border: "1px solid #ccc" },
  novel: "#8B7355",
  "piloted.robot": "#607D8B",
  psychological: { background: "#2F4F4F", color: "#FFFFFF" },
  romance: "#FF1493",
  "school.life": { background: "#87CEEB", color: "#333333" },
  scifi: "#00CED1",
  "science.fiction": "#00CED1",
  seinen: "#696969",
  shotacon: { background: "#ADD8E6", color: "#333333" },
  shoujo: { background: "#FFDAE9", color: "#333333" },
  shounen: "#FFA500",
  "shounen.ai": { background: "#ADD8E6", color: "#333333" },
  slapstick: { background: "#FFFFE0", color: "#555555" },
  "slice.of.life": { background: "#98FB98", color: "#333333" },
  software: "#4169E1",
  sports: "#32CD32",
  steampunk: "#CD853F",
  "super.power": "#DC143C",
  supernatural: { background: "#483D8B", color: "#FFFFFF" },
  thriller: { background: "#1A1A1A", color: "#FFFFFF" },
  underworld: { background: "#333333", color: "#FFFFFF" },
  violence: "#8B0000",
  yaoi: { background: "#AFEEEE", color: "#333333" },
  yuri: { background: "#F08080", color: "#333333" },
};

export function formatTagName(tag: string): string {
  return tag
    .replace(/\./g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface EnhancedTagProps {
  tag: string;
  href?: string;
  children?: ReactNode;
}

export function EnhancedTag({ tag, href, children }: EnhancedTagProps) {
  const tagText = tag.trim().toLowerCase();
  const formattedText = children || formatTagName(tagText);
  const style = getTagStyle(tagText);

  if (href) {
    return (
      <a
        href={href}
        style={style}
        className="px-10px py-3px mx-3px my-1px rounded text-[10px] font-medium no-underline"
      >
        {formattedText}
      </a>
    );
  }

  return (
    <span style={style} className="px-2 py-1 rounded text-xs font-medium text-xl">
      {formattedText}
    </span>
  );
}

export function getTagStyle(tag: string): React.CSSProperties {
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
}

export function transformTagElement(tagElement: HTMLAnchorElement, enabled: boolean): void {
  if (!enabled) {
    // Restore original element if we have it
    const originalElement = document.querySelector(
      `[data-original-id="${tagElement.id || tagElement.getAttribute("data-tag-id")}"]`,
    );
    if (originalElement?.parentNode) {
      originalElement.parentNode.replaceChild(tagElement, originalElement);
    }
    return;
  }

  // Skip if already processed
  if (tagElement.hasAttribute("data-ab-processed")) {
    return;
  }

  const tagText = tagElement.textContent?.trim().toLowerCase() || "";
  if (!tagText) {
    return;
  }

  // Mark as processed immediately
  tagElement.setAttribute("data-ab-processed", "true");

  // Create a temporary container to render the component
  const tempContainer = document.createElement("div");

  // Render the EnhancedTag component
  render(
    <EnhancedTag tag={tagText} href={tagElement.href}>
      {formatTagName(tagText)}
    </EnhancedTag>,
    tempContainer,
  );

  // Get the rendered element
  const enhancedElement = tempContainer.firstElementChild as HTMLElement;
  if (!enhancedElement) return;

  // Mark the enhanced element so it won't be processed again
  enhancedElement.setAttribute("data-ab-processed", "true");

  // Copy over important attributes from original
  const id = tagElement.id || `tag-${Date.now()}`;
  tagElement.setAttribute("data-tag-id", id);
  enhancedElement.setAttribute("data-original-id", id);

  // Preserve the float style if it exists
  if (tagElement.style.float) {
    enhancedElement.style.float = tagElement.style.float;
  }

  // Replace the original element with the enhanced one
  tagElement.parentNode?.replaceChild(enhancedElement, tagElement);
}

export function applyTagStyling(selector: string, enabled: boolean): void {
  const tagElements = document.querySelectorAll<HTMLAnchorElement>(selector);
  tagElements.forEach((tag) => transformTagElement(tag, enabled));
}
