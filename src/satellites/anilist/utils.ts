import { err, log } from "@/lib/utils/logging";
/**
 * AniList-specific utility functions
 */

/**
 * Extract title and year from AniList page
 * Moved from src/utils/format-mapping.ts as it's only used for AniList functionality
 */
export function extractMediaInfo(): {
  title: string;
  year: string;
  format: string;
} | null {
  try {
    log("extractMediaInfo starting");

    const data = Array.from(document.querySelectorAll(".sidebar > .data .type"));
    log(
      "Found data elements",
      data.length,
      data.map((el) => el.textContent?.trim()),
    );

    const formatElement = data.find((el) => el.textContent?.trim() === "Format");
    const yearElement = data.find(
      (el) => el.textContent?.trim() === "Start Date" || el.textContent?.trim() === "Release Date",
    );
    const englishElement = data.find((el) => el.textContent?.trim() === "English");
    const romajiElement = data.find((el) => el.textContent?.trim() === "Romaji");

    log("Found elements", {
      formatElement: !!formatElement,
      yearElement: !!yearElement,
      englishElement: !!englishElement,
      romajiElement: !!romajiElement,
    });

    if (!formatElement) {
      log("No format element found");
      return null;
    }

    const format = formatElement.nextElementSibling?.textContent?.trim();
    log("Extracted format", format);

    if (!format) {
      log("Format element has no next sibling or no text content");
      return null;
    }

    const title =
      englishElement?.nextElementSibling?.textContent?.trim() || romajiElement?.nextElementSibling?.textContent?.trim();

    log("Extracted title candidates", {
      english: englishElement?.nextElementSibling?.textContent?.trim(),
      romaji: romajiElement?.nextElementSibling?.textContent?.trim(),
      finalTitle: title,
    });

    if (!title) {
      log("No title found");
      return null;
    }

    const year = yearElement?.nextElementSibling?.textContent?.trim()?.slice(-4) || "";
    log("Extracted year", {
      yearText: yearElement?.nextElementSibling?.textContent?.trim(),
      finalYear: year,
    });

    const result = { title, year, format };
    log("extractMediaInfo result", result);
    return result;
  } catch (error) {
    err("Failed to extract media info", error);
    return null;
  }
}
