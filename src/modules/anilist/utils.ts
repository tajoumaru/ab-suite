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
    console.log("AB Suite: extractMediaInfo starting");

    const data = Array.from(document.querySelectorAll(".sidebar > .data .type"));
    console.log(
      "AB Suite: Found data elements",
      data.length,
      data.map((el) => el.textContent?.trim()),
    );

    const formatElement = data.find((el) => el.textContent?.trim() === "Format");
    const yearElement = data.find(
      (el) => el.textContent?.trim() === "Start Date" || el.textContent?.trim() === "Release Date",
    );
    const englishElement = data.find((el) => el.textContent?.trim() === "English");
    const romajiElement = data.find((el) => el.textContent?.trim() === "Romaji");

    console.log("AB Suite: Found elements", {
      formatElement: !!formatElement,
      yearElement: !!yearElement,
      englishElement: !!englishElement,
      romajiElement: !!romajiElement,
    });

    if (!formatElement) {
      console.log("AB Suite: No format element found");
      return null;
    }

    const format = formatElement.nextElementSibling?.textContent?.trim();
    console.log("AB Suite: Extracted format", format);

    if (!format) {
      console.log("AB Suite: Format element has no next sibling or no text content");
      return null;
    }

    const title =
      englishElement?.nextElementSibling?.textContent?.trim() || romajiElement?.nextElementSibling?.textContent?.trim();

    console.log("AB Suite: Extracted title candidates", {
      english: englishElement?.nextElementSibling?.textContent?.trim(),
      romaji: romajiElement?.nextElementSibling?.textContent?.trim(),
      finalTitle: title,
    });

    if (!title) {
      console.log("AB Suite: No title found");
      return null;
    }

    const year = yearElement?.nextElementSibling?.textContent?.trim()?.slice(-4) || "";
    console.log("AB Suite: Extracted year", {
      yearText: yearElement?.nextElementSibling?.textContent?.trim(),
      finalYear: year,
    });

    const result = { title, year, format };
    console.log("AB Suite: extractMediaInfo result", result);
    return result;
  } catch (error) {
    console.error("AB Suite: Failed to extract media info", error);
    return null;
  }
}
