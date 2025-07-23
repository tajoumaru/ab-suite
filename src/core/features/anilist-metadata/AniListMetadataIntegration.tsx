import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { log } from "@/lib/utils/logging";
import type { AniListMediaData } from "@/services/anilist";
import { aniListService } from "@/services/anilist";
import { useSettingsStore } from "@/lib/state/settings";
import { useEnhancedCharacterCards } from "@/core/features/character-cards/EnhancedCharacterCards";
import { useEnhancedExtendedInfo } from "@/core/features/enhanced-extended-info/EnhancedExtendedInfo";
import { useEnhancedSynopsis } from "@/core/features/enhanced-synopsis/EnhancedSynopsis";
import { useMediaInfo } from "@/core/shared/hooks/useMediaInfo";

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

  // Memoize the AniList ID to prevent unnecessary re-renders
  const anilistId = useMemo(() => mediaInfo?.apiData?.anilist, [mediaInfo?.apiData?.anilist]);

  // Only log when state actually changes
  useEffect(() => {
    log("AniListMetadataIntegration render:", {
      aniListMetadataEnabled,
      hasMediaInfo: !!mediaInfo,
      anilistId,
      hasAniListData: !!aniListData,
      loading,
      error,
    });
  }, [aniListMetadataEnabled, mediaInfo, anilistId, aniListData, loading, error]);

  // Memoize the fetch function to prevent recreating it on every render
  const fetchAniListData = useCallback(async () => {
    if (!anilistId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
  }, [anilistId]);

  // Fetch AniList data when conditions are met
  useEffect(() => {
    if (!aniListMetadataEnabled || !anilistId || aniListData) {
      return;
    }

    fetchAniListData();
  }, [aniListMetadataEnabled, anilistId, aniListData, fetchAniListData]);

  // Only log hook calls when data changes
  useEffect(() => {
    if (aniListData) {
      log("Calling enhanced component hooks with aniListData:", {
        hasAniListData: true,
        dataTitle: aniListData.title?.romaji,
      });
    }
  }, [aniListData]);

  // Initialize enhanced components when AniList data is available
  useEnhancedSynopsis(aniListData);
  useEnhancedExtendedInfo(aniListData);
  useEnhancedCharacterCards(aniListData);

  // Consolidated debug logging
  useEffect(() => {
    if (loading) {
      log("Loading AniList metadata...");
    } else if (error) {
      log(`AniList metadata error: ${error}`);
    } else if (aniListData) {
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
