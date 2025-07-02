import { useEffect, useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import "@/styles/animebytes.css";
import { insertAfter } from "@/utils/dom";
import { PRINTED_MEDIA_TYPES } from "@/utils/format-mapping";

interface MediaInfo {
  seriesTitle: string;
  mediaType: string;
  searchTitle: string;
}

export function ExternalLinks() {
  const { anilistIntegrationEnabled } = useSettingsStore();
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);

  useEffect(() => {
    if (!anilistIntegrationEnabled || !window.location.pathname.includes("/torrents.php")) {
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

        return { seriesTitle, mediaType, searchTitle };
      } catch (error) {
        console.error("AB Suite: Failed to extract media info from AnimeBytes", error);
        return null;
      }
    };

    const info = extractMediaInfo();
    setMediaInfo(info);
  }, [anilistIntegrationEnabled]);

  useEffect(() => {
    if (!mediaInfo || !anilistIntegrationEnabled) return;

    const addLinks = () => {
      // Find the header element (last h3 a element)
      const headers = document.querySelectorAll("h3 a");
      let header = headers[headers.length - 1] as HTMLAnchorElement;

      if (!header) {
        const h3 = document.querySelector("h3");
        if (h3) {
          header = document.createElement("a");
          h3.appendChild(header);
        } else {
          return;
        }
      }

      // Check if links already exist to prevent infinite loop
      if (header.parentNode?.querySelector(".ab-external-links") || header.nextSibling?.textContent?.includes(" | ")) {
        return;
      }

      const { searchTitle, mediaType } = mediaInfo;
      const encodedTitle = encodeURIComponent(searchTitle);

      // Determine search media type
      const searchMediaType = PRINTED_MEDIA_TYPES.includes(mediaType) ? "manga" : "anime";

      // Create links
      const links = [
        {
          name: "AniList",
          url: `https://anilist.co/search/${searchMediaType}?search=${encodedTitle}`,
        },
      ];

      if (searchMediaType === "manga") {
        links.push({
          name: "MangaDex",
          url: `https://mangadex.org/search?q=${encodedTitle}`,
        });
      }

      // Add links
      links.forEach((link) => {
        // Add separator
        const separator = document.createTextNode(" | ");
        insertAfter(separator, header);

        // Add link
        const linkEl = document.createElement("a");
        linkEl.textContent = link.name;
        linkEl.href = link.url;
        linkEl.target = "_blank";
        linkEl.rel = "noopener noreferrer";
        linkEl.title = `Search "${searchTitle}" on ${link.name}`;

        insertAfter(linkEl, separator);
        header = linkEl;
      });
    };

    // Add links once when media info is available
    addLinks();
  }, [mediaInfo, anilistIntegrationEnabled]);

  // This component doesn't render anything directly
  // It manipulates the DOM to add links to existing elements
  return null;
}
