import { useEffect, useState } from "preact/hooks";
import { PRINTED_MEDIA_TYPES } from "@/utils/format-mapping";

export interface MediaInfo {
  seriesTitle: string;
  mediaType: string;
  searchTitle: string;
  searchMediaType: "anime" | "manga";
  externalLinks: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * Custom hook to extract media information from the torrent group page.
 * This replaces the imperative data extraction from ExternalLinks component.
 */
export function useMediaInfo(): MediaInfo | null {
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);

  useEffect(() => {
    // Only run on torrent pages
    if (!window.location.pathname.includes("/torrents.php")) {
      return;
    }

    const extractMediaInfo = (): MediaInfo | null => {
      try {
        let seriesTitle: string;
        let mediaType: string;
        const isEditPage = window.location.href.includes("action=editgroup");

        if (isEditPage) {
          const h2Links = document.querySelectorAll("h2 a");
          if (h2Links.length < 2) return null;

          seriesTitle = h2Links[0]?.textContent?.trim() || "";
          mediaType = h2Links[1]?.textContent?.trim() || "";
        } else {
          const h2Element = document.querySelector("h2");
          if (!h2Element) return null;

          const html = h2Element.innerHTML;
          const match = html.match(/>(.*?)<\/a> - (.*?) \[\d{4}\]/);
          if (!match) return null;

          seriesTitle = match[1];
          mediaType = match[2];
        }

        if (!seriesTitle || !mediaType) return null;

        // Get romaji title if available
        let searchTitle = seriesTitle;
        const mangaStats = document.getElementsByClassName("stats nobullet")[0];
        if (mangaStats) {
          const romajiMatch = mangaStats.innerHTML.match(/Romaji Title:<\/strong> <br>(.*?)<\/li>/);
          if (romajiMatch) {
            searchTitle = romajiMatch[1];
          }
        }

        // Handle URL encoding
        searchTitle = searchTitle.replace(/&amp;/g, "%26");

        // Determine search media type
        const searchMediaType = PRINTED_MEDIA_TYPES.includes(mediaType) ? "manga" : "anime";
        const encodedTitle = encodeURIComponent(searchTitle);

        // Create external links
        const externalLinks = [
          {
            name: "AniList",
            url: `https://anilist.co/search/${searchMediaType}?search=${encodedTitle}`,
          },
        ];

        if (searchMediaType === "manga") {
          externalLinks.push({
            name: "MangaDex",
            url: `https://mangadex.org/search?q=${encodedTitle}`,
          });
        }

        return {
          seriesTitle,
          mediaType,
          searchTitle,
          searchMediaType,
          externalLinks,
        };
      } catch (error) {
        console.error("AB Suite: Failed to extract media info", error);
        return null;
      }
    };

    const info = extractMediaInfo();
    setMediaInfo(info);
  }, []);

  return mediaInfo;
}
