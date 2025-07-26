import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { EnhancedCharacterCards, processCharacterData } from "@/core/features/character-cards";
import { ExternalLinksBar } from "@/core/features/external-links/ExternalLinksBar";
import { GalleryView } from "@/core/features/gallery-view";
import {
  detectTableType,
  extractGroupedTorrentData,
  type GroupedTorrents,
  TorrentTable,
} from "@/core/features/modern-table";
import { Ratings } from "@/core/features/ratings/Ratings";
import { RelationsBox } from "@/core/features/relations-box";
import { Trailers } from "@/core/features/trailers/Trailers";
import { type AnimeApiResponse, clearMediaInfoCache, useMediaInfo } from "@/core/shared/hooks/useMediaInfo";
import { useSeaDexUpdates } from "@/core/shared/seadex";
import { useSettingsStore } from "@/lib/state/settings";
import { err, log } from "@/lib/utils/logging";
import { type AniListMediaData, aniListService } from "@/services/anilist";

// Default empty AnimeApiResponse for when no data is available
const DEFAULT_API_DATA: AnimeApiResponse = {
  title: "",
  anidb: null,
  anilist: null,
  animenewsnetwork: null,
  animeplanet: null,
  anisearch: null,
  annict: null,
  imdb: null,
  kaize: null,
  kaize_id: null,
  kitsu: null,
  livechart: null,
  myanimelist: null,
  nautiljon: null,
  nautiljon_id: null,
  notify: null,
  otakotaku: null,
  simkl: null,
  shikimori: null,
  shoboi: null,
  silveryasha: null,
  themoviedb: null,
  trakt: null,
  trakt_type: null,
  trakt_season: null,
};

/**
 * Comprehensive component that implements declarative takeover for the entire torrent group page.
 * This component:
 * 1. Finds the original torrent table and group header (anchors)
 * 2. Extracts data from them once into clean JS objects
 * 3. Hides the original elements
 * 4. Renders our enhanced Preact-based components with the extracted data
 * 5. Reactively updates when SeaDex data becomes available
 *
 * This replaces both the old TorrentPage and ExternalLinks components.
 */
export function TorrentGroupPage() {
  const {
    tableRestructureEnabled,
    mediainfoParserEnabled,
    anilistIntegrationEnabled,
    aniListMetadataEnabled,
    RatingsEnabled,
    TrailersEnabled,
    galleryViewEnabled,
    relationsBoxEnabled,
  } = useSettingsStore();
  const [groupedData, setGroupedData] = useState<GroupedTorrents | null>(null);
  const [tableType, setTableType] = useState<"anime" | "printed_media" | "games" | "music">("anime");
  const [isInitialized, setIsInitialized] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLSpanElement>(null);
  const sectionsContainerRef = useRef<HTMLDivElement>(null);
  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const [plotSynopsisHtml, setPlotSynopsisHtml] = useState<string | null>(null);
  const [aniListData, setAniListData] = useState<AniListMediaData | null>(null);
  const [characterOriginalContent, setCharacterOriginalContent] = useState<string | null>(null);
  const mediaInfo = useMediaInfo();

  // Clear media info cache when URL changes to prevent stale data
  useEffect(() => {
    return () => {
      // Clear cache when component unmounts or URL changes
      clearMediaInfoCache();
    };
  }, [window.location.href]);

  // Fetch AniList data when conditions are met
  useEffect(() => {
    if (!aniListMetadataEnabled || !mediaInfo?.apiData?.anilist || aniListData) {
      return;
    }

    const fetchAniListData = async () => {
      if (!mediaInfo?.apiData?.anilist) return;

      try {
        log(`Fetching AniList metadata for ID: ${mediaInfo.apiData.anilist}`);
        const data = await aniListService.fetchMediaData(mediaInfo.apiData.anilist);

        if (data) {
          setAniListData(data);
          log("Successfully fetched AniList metadata for character cards");
        }
      } catch (error) {
        err("Failed to fetch AniList metadata for character cards:", error);
      }
    };

    fetchAniListData();
  }, [aniListMetadataEnabled, mediaInfo?.apiData?.anilist, aniListData]);

  const initializeTorrentGroupPage = () => {
    // Find the original torrent table (our anchor)
    const originalTable = document.querySelector(".torrent_table") as HTMLTableElement;

    if (!originalTable || isInitialized) {
      return;
    }

    try {
      // Detect table type and extract data from the original table
      const detectedTableType = detectTableType(originalTable);
      const extractedGroupedData = extractGroupedTorrentData(originalTable, mediainfoParserEnabled, detectedTableType);

      // Calculate total torrents
      const totalTorrents = extractedGroupedData.sections.reduce((sum: number, s) => sum + s.torrents.length, 0);

      if (totalTorrents === 0) {
        return;
      }

      log(`Detected table type '${detectedTableType}' for torrent group page with ${totalTorrents} torrents`);

      // Store the extracted data
      setGroupedData(extractedGroupedData);
      setTableType(detectedTableType);

      // Hide the original table
      originalTable.style.display = "none";

      // Create container for our enhanced torrent table
      const tableContainer = document.createElement("div");
      tableContainer.id = "ab-modern-torrent-table";
      originalTable.parentNode?.insertBefore(tableContainer, originalTable);

      // Store the container reference for rendering
      tableContainerRef.current = tableContainer;

      // Create container for gallery view
      if (galleryViewEnabled) {
        const galleryContainer = document.createElement("div");
        galleryContainer.id = "ab-gallery-container";
        originalTable.parentNode?.insertBefore(galleryContainer, originalTable);
        galleryContainerRef.current = galleryContainer;
      }

      // Mark as initialized
      setIsInitialized(true);

      log("Torrent group page initialized with", totalTorrents, "torrents");
    } catch (error) {
      err("Failed to initialize torrent group page", error);
    }
  };

  useEffect(() => {
    if (!tableRestructureEnabled) {
      return;
    }

    // Only run on torrent pages (both torrents.php and torrents2.php for music)
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    // Initialize immediately - no artificial delay
    initializeTorrentGroupPage();
  }, [tableRestructureEnabled, mediainfoParserEnabled, isInitialized]);

  // Listen for SeaDex updates
  // The TorrentTable component will handle SeaDex updates internally now
  useSeaDexUpdates(() => {
    log("SeaDex processing complete, table will update automatically");
  });

  // Handle external links integration
  useEffect(() => {
    if (!anilistIntegrationEnabled || !mediaInfo) {
      return;
    }

    // Only run on torrent pages (both torrents.php and torrents2.php for music)
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    const integrateExternalLinks = () => {
      // Find the header element (last h3 a element)
      const headers = document.querySelectorAll("h3 a");
      const lastHeader = headers[headers.length - 1] as HTMLAnchorElement;

      if (!lastHeader) {
        return;
      }

      // Check if links already exist to prevent duplication
      if (lastHeader.parentNode?.querySelector(".ab-external-links")) {
        return;
      }

      // Create container for external links
      const linksContainer = document.createElement("span");
      lastHeader.parentNode?.insertBefore(linksContainer, lastHeader.nextSibling);

      // Store the container reference
      headerContainerRef.current = linksContainer;

      log("External links container created");
    };

    integrateExternalLinks();
  }, [anilistIntegrationEnabled, mediaInfo]);

  // Handle sections container creation and plot synopsis extraction
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // Only run on torrent pages
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    const integrateSections = () => {
      const modernTable = document.querySelector("#ab-modern-torrent-table");
      if (!modernTable || document.querySelector("#ab-sections-container")) {
        return;
      }

      // Create single container for all sections
      const sectionsContainer = document.createElement("div");
      sectionsContainer.id = "ab-sections-container";
      modernTable.parentNode?.insertBefore(sectionsContainer, modernTable);
      sectionsContainerRef.current = sectionsContainer;

      // Extract plot synopsis HTML and character listing HTML, hide originals
      const boxes = document.querySelectorAll("div.box");
      for (const box of boxes) {
        const head = box.querySelector("div.head");
        const headText = head?.textContent;

        if (headText?.includes("Plot Synopsis")) {
          setPlotSynopsisHtml(box.outerHTML);
          (box as HTMLElement).style.display = "none";
        } else if (headText?.includes("Character and Seiyuu Listing")) {
          const bodyElement = box.querySelector(".body") as HTMLElement;
          const originalContent = bodyElement ? bodyElement.innerHTML : "";
          setCharacterOriginalContent(originalContent);
          (box as HTMLElement).style.display = "none";
          log("Extracted character listing content for processing");
        }
      }

      log("Sections container created");
    };

    integrateSections();
  }, [isInitialized]);

  // Render the components into their containers when we have data
  useEffect(() => {
    if (isInitialized && tableContainerRef.current && groupedData) {
      render(
        <TorrentTable groupedData={groupedData} tableType={tableType} isSeriesPage={false} />,
        tableContainerRef.current,
      );
    }
  }, [isInitialized, groupedData, tableType]);

  // Render external links when we have media info
  useEffect(() => {
    if (anilistIntegrationEnabled && mediaInfo && headerContainerRef.current) {
      render(<ExternalLinksBar mediaInfo={mediaInfo} />, headerContainerRef.current);
    }
  }, [anilistIntegrationEnabled, mediaInfo]);

  // Render all sections in proper order: ratings > synopsis > characters > trailers
  useEffect(() => {
    if (sectionsContainerRef.current && isInitialized) {
      const SectionsContainer = () => (
        <>
          {plotSynopsisHtml && <div dangerouslySetInnerHTML={{ __html: plotSynopsisHtml }} />}
          {relationsBoxEnabled && <RelationsBox />}
          <div id="ab-characters-placeholder" />
          {RatingsEnabled && (
            <Ratings apiData={mediaInfo?.apiData || DEFAULT_API_DATA} mediaInfo={mediaInfo || undefined} />
          )}
          {TrailersEnabled && (
            <Trailers apiData={mediaInfo?.apiData || DEFAULT_API_DATA} mediaInfo={mediaInfo || undefined} />
          )}
        </>
      );

      render(<SectionsContainer />, sectionsContainerRef.current);
    }
  }, [TrailersEnabled, RatingsEnabled, relationsBoxEnabled, mediaInfo, plotSynopsisHtml, isInitialized]);

  // Handle character cards integration in the placeholder
  useEffect(() => {
    if (!aniListMetadataEnabled || !aniListData) {
      return;
    }

    const charactersPlaceholder = document.querySelector("#ab-characters-placeholder");
    if (!charactersPlaceholder) {
      return;
    }

    const charactersWithLinks = characterOriginalContent
      ? processCharacterData(aniListData, characterOriginalContent)
      : processCharacterData(aniListData);

    if (charactersWithLinks && charactersWithLinks.length > 0) {
      render(
        <EnhancedCharacterCards
          characters={charactersWithLinks}
          originalContent={characterOriginalContent || undefined}
          showToggle={!!characterOriginalContent}
        />,
        charactersPlaceholder,
      );
    }
  }, [aniListMetadataEnabled, aniListData, characterOriginalContent]);

  // Render gallery view when enabled
  useEffect(() => {
    if (galleryViewEnabled && galleryContainerRef.current) {
      render(<GalleryView />, galleryContainerRef.current);
    }
  }, [galleryViewEnabled]);

  // This component doesn't render anything directly - it manages DOM takeover
  return null;
}
