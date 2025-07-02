import type { FormatMap, MediaType } from "@/types";

export const FORMAT_MAP: FormatMap = {
  anime: {
    TV: ["tv_series"],
    "TV Short": ["tv_series"],
    Movie: ["movie"],
    Special: ["tv_special", "dvd_special", "bd_special"],
    OVA: ["ova"],
    ONA: ["ona"],
  },
  manga: {
    Manga: ["manga", "anthology"],
    "Manga (South Korea)": ["manhwa"],
    "Manga (Chinese)": ["manhua"],
    "Manga (Taiwanese)": ["manhua"],
    "Light Novel": ["light_novel"],
    "One Shot": ["oneshot"],
  },
};

export const PRINTED_MEDIA_TYPES = ["Manga", "Oneshot", "Manhwa", "Manhua", "Light Novel", "Anthology"];

/**
 * Get AnimeBytes format codes from AniList format string
 */
export function getAnimeBytesFormats(anilistFormat: string, mediaType: MediaType): string[] {
  // Music uses different URL structure, so no format codes needed
  if (mediaType === "music") {
    return [];
  }

  const formatMap = FORMAT_MAP[mediaType as "anime" | "manga"];
  return formatMap[anilistFormat] || [];
}

/**
 * Determine media type from AniList format
 */
export function getMediaTypeFromFormat(format: string, urlType: string): MediaType {
  if (getAnimeBytesFormats(format, "anime").includes("music")) {
    return "music";
  }

  if (urlType === "manga" || PRINTED_MEDIA_TYPES.includes(format)) {
    return "manga";
  }

  return "anime";
}

/**
 * Build AnimeBytes search URL
 */
export function buildAnimeBytesUrl(params: {
  title: string;
  year?: string;
  mediaType: MediaType;
  formats: string[];
}): string {
  const { title, year, mediaType, formats } = params;

  if (mediaType === "music") {
    const baseUrl = "https://animebytes.tv/torrents2.php?";
    const searchParams = new URLSearchParams({
      groupname: title,
    });

    if (year) {
      searchParams.append("year", year);
      searchParams.append("year2", year);
    }

    return `${baseUrl}${searchParams.toString()}`;
  }

  const baseUrl = "https://animebytes.tv/torrents.php?";
  const searchParams = new URLSearchParams({
    searchstr: title,
  });

  if (year) {
    searchParams.append("year", year);
    searchParams.append("year2", year);
  }

  // Add category filter
  const categoryFilter = mediaType === "anime" ? "1" : "2";
  searchParams.append(`filter_cat[${categoryFilter}]`, "1");

  // Add format filters
  const formatKey = mediaType === "anime" ? "anime" : "printedType";
  formats.forEach((format) => {
    searchParams.append(`${formatKey}[${format}]`, "1");
  });

  return `${baseUrl}${searchParams.toString()}`;
}

/**
 * Extract title and year from AniList page
 */
export function extractMediaInfo(): {
  title: string;
  year: string;
  format: string;
} | null {
  try {
    const data = Array.from(document.querySelectorAll(".sidebar > .data .type"));

    const formatElement = data.find((el) => el.textContent?.trim() === "Format");
    const yearElement = data.find(
      (el) => el.textContent?.trim() === "Start Date" || el.textContent?.trim() === "Release Date",
    );
    const englishElement = data.find((el) => el.textContent?.trim() === "English");
    const romajiElement = data.find((el) => el.textContent?.trim() === "Romaji");

    if (!formatElement) return null;

    const format = formatElement.nextElementSibling?.textContent?.trim();
    if (!format) return null;

    const title =
      englishElement?.nextElementSibling?.textContent?.trim() || romajiElement?.nextElementSibling?.textContent?.trim();

    if (!title) return null;

    const year = yearElement?.nextElementSibling?.textContent?.trim()?.slice(-4) || "";

    return { title, year, format };
  } catch (error) {
    console.error("AB Suite: Failed to extract media info", error);
    return null;
  }
}
