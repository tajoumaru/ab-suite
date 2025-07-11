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
    // Only reset if it was previously enhanced
    if (tagElement.classList.contains("ab-enhanced-tag")) {
      tagElement.classList.remove("ab-enhanced-tag");
      tagElement.style.backgroundColor = "";
      tagElement.style.color = "";
      tagElement.style.border = "";

      // Restore original text if we saved it
      const originalText = tagElement.getAttribute("data-original-text");
      if (originalText) {
        tagElement.textContent = originalText;
        tagElement.removeAttribute("data-original-text");
      }
    }
    return;
  }

  // Skip if already enhanced
  if (tagElement.classList.contains("ab-enhanced-tag")) {
    return;
  }

  const tagText = tagElement.textContent?.trim().toLowerCase() || "";

  // Skip if no valid tag text
  if (!tagText) {
    return;
  }

  const formattedText = formatTagName(tagText);

  // Skip if the text wouldn't change (avoid unnecessary DOM modifications)
  if (tagElement.textContent === formattedText) {
    // Still apply styling even if text is the same
    tagElement.classList.add("ab-enhanced-tag");
    const style = getTagStyle(tagText);
    Object.assign(tagElement.style, style);
    return;
  }

  // Save original text before transformation
  tagElement.setAttribute("data-original-text", tagElement.textContent || "");

  // Apply formatted text
  tagElement.textContent = formattedText;

  // Add CSS class for base styling
  tagElement.classList.add("ab-enhanced-tag");

  // Apply color-specific styles
  const style = getTagStyle(tagText);
  Object.assign(tagElement.style, style);
}

export function applyTagStyling(selector: string, enabled: boolean): void {
  const tagElements = document.querySelectorAll<HTMLAnchorElement>(selector);
  tagElements.forEach((tag) => transformTagElement(tag, enabled));
}
