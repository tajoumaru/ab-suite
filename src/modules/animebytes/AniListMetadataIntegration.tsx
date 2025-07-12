import { useEffect, useState } from "preact/hooks";
import type { AniListMediaData } from "@/services/anilist";
import { aniListService } from "@/services/anilist";
import { useSettingsStore } from "@/stores/settings";
import { log } from "@/utils/logging";
import { useEnhancedCharacterCards } from "./EnhancedCharacterCards";
import { useEnhancedExtendedInfo } from "./EnhancedExtendedInfo";
import { useEnhancedSynopsis } from "./EnhancedSynopsis";
import { useMediaInfo } from "./hooks/useMediaInfo";

/**
 * Main AniList metadata integration component that fetches AniList data
 * and coordinates all the enhanced components
 */
export function AniListMetadataIntegration() {
  const { aniListMetadataEnabled } = useSettingsStore(["aniListMetadataEnabled"]);
  const mediaInfo = useMediaInfo();
  const [aniListData, setAniListData] = useState<AniListMediaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  log("AniListMetadataIntegration render:", {
    aniListMetadataEnabled,
    hasMediaInfo: !!mediaInfo,
    anilistId: mediaInfo?.apiData?.anilist,
    hasAniListData: !!aniListData,
    loading,
    error,
  });

  // Fetch AniList data when mediaInfo is available and feature is enabled
  useEffect(() => {
    if (!aniListMetadataEnabled || !mediaInfo?.apiData?.anilist) {
      return;
    }

    const fetchAniListData = async () => {
      try {
        setLoading(true);
        setError(null);

        const anilistId = mediaInfo.apiData?.anilist;
        if (!anilistId) {
          setError("No AniList ID found in media info");
          return;
        }
        log(`Fetching AniList metadata for ID: ${anilistId}`);

        const data = await aniListService.fetchMediaData(anilistId);

        if (data) {
          setAniListData(data);
          log("Successfully fetched AniList metadata", {
            title: data.title?.romaji,
            hasDescription: !!data.description,
            descriptionLength: data.description?.length || 0,
            hasCharacters: data.characters?.edges?.length > 0,
            charactersCount: data.characters?.edges?.length || 0,
            hasStudios: data.studios?.nodes?.length > 0,
          });
        } else {
          setError("Failed to fetch AniList metadata");
          log("Failed to fetch AniList metadata");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        log(`Error fetching AniList metadata: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAniListData();
  }, [aniListMetadataEnabled, mediaInfo]);

  // Initialize enhanced components when AniList data is available
  log("Calling enhanced component hooks with aniListData:", {
    hasAniListData: !!aniListData,
    dataTitle: aniListData?.title?.romaji,
  });
  useEnhancedSynopsis(aniListData);
  useEnhancedExtendedInfo(aniListData);
  useEnhancedCharacterCards(aniListData);

  // Debug logging
  useEffect(() => {
    if (loading) {
      log("Loading AniList metadata...");
    }
    if (error) {
      log(`AniList metadata error: ${error}`);
    }
    if (aniListData) {
      log("AniList metadata loaded successfully");
    }
  }, [loading, error, aniListData]);

  // This component doesn't render anything visible - it just manages the integration
  return null;
}

/**
 * Hook to check if AniList metadata integration is supported on current page
 */
export function useAniListMetadataSupport(): boolean {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if we're on a torrent page (where media info is available)
    const isTorrentPage = window.location.pathname.includes("/torrents.php");

    // Check if we're on a group/series page (not individual torrent page)
    const isGroupPage = !window.location.search.includes("torrentid=");

    setIsSupported(isTorrentPage && isGroupPage);
  }, []);

  return isSupported;
}

/**
 * Settings for AniList metadata integration
 */
export const ANILIST_METADATA_SETTINGS = {
  key: "aniListMetadataEnabled",
  title: "AniList Metadata Enhancement",
  description:
    "Replace basic metadata sections with enhanced AniList data including improved synopsis, extended info, and character cards.",
  category: "metadata",
  default: false,
  dependencies: [],
  helpUrl: "https://docs.anthropic.com/ab-suite/features/anilist-metadata",
} as const;
