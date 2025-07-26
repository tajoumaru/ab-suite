import { useEffect, useState } from "preact/hooks";
import type { AnimeApiResponse, MediaInfo } from "@/core/shared/hooks/useMediaInfo";
import { useAsync } from "@/lib/hooks/useAsync";
import { useSettingsStore } from "@/lib/state/settings";
import { err } from "@/lib/utils/logging";
import { aniListService } from "@/services/anilist";
import { fetchAllTrailers, type Trailer, type TrailerCollection } from "@/services/trailers";

interface TrailersProps {
  apiData: AnimeApiResponse;
  mediaInfo?: MediaInfo;
}

export function Trailers({ apiData, mediaInfo }: TrailersProps) {
  const settings = useSettingsStore(["tmdbApiToken", "youtubeApiKey", "youtubePrivacyModeEnabled"]);
  const [selectedTrailerIndex, setSelectedTrailerIndex] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [iframeContainer, setIframeContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setHasInitialized(true);
  }, []);

  const trailersAsync = useAsync(
    async (): Promise<TrailerCollection> => {
      if (!apiData.myanimelist && !apiData.themoviedb && !apiData.anilist) {
        return {
          trailers: [],
          loading: false,
          error: false,
        };
      }

      // Fetch AniList data if we have an AniList ID
      let aniListData: Awaited<ReturnType<typeof aniListService.fetchMediaData>> = null;
      if (apiData.anilist) {
        try {
          aniListData = await aniListService.fetchMediaData(apiData.anilist);
        } catch (error) {
          err("Failed to fetch AniList data for trailers", error);
        }
      }

      const result = await fetchAllTrailers(
        {
          myanimelist: apiData.myanimelist || undefined,
          themoviedb: apiData.themoviedb || undefined,
          anilist: aniListData || undefined,
        },
        mediaInfo?.searchMediaType || "anime",
        settings.tmdbApiToken,
        settings.youtubeApiKey,
      );

      return result;
    },
    {
      deps: [
        apiData.myanimelist,
        apiData.themoviedb,
        apiData.anilist,
        mediaInfo?.searchMediaType,
        settings.tmdbApiToken,
        settings.youtubeApiKey,
        settings.youtubePrivacyModeEnabled,
      ],
      onError: (error) => {
        err("Failed to load trailers", error);
      },
    },
  );

  const trailerData = trailersAsync.data || { trailers: [], loading: false, error: false };

  const formatTrailerTitle = (trailer: Trailer) => {
    // Use the trailer name as-is, without adding provider info
    // The legacy code doesn't show provider info in dropdown
    return trailer.name;
  };

  const getEmbedUrl = (trailer: Trailer) => {
    // Use regular YouTube URL by default for full features, nocookie if privacy mode enabled
    const domain = settings.youtubePrivacyModeEnabled ? "www.youtube-nocookie.com" : "www.youtube.com";
    return `https://${domain}/embed/${trailer.youtubeId}`;
  };

  const handleTrailerChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    setSelectedTrailerIndex(parseInt(target.value));
  };

  // Reset selected index when trailers change
  useEffect(() => {
    if (trailerData.trailers.length > 0 && selectedTrailerIndex >= trailerData.trailers.length) {
      setSelectedTrailerIndex(0);
    }
  }, [trailerData.trailers.length, selectedTrailerIndex]);

  // Create iframe using GM_addElement to bypass CSP when using regular YouTube
  const createIframe = (container: HTMLDivElement, trailer: Trailer) => {
    // Clear existing content
    container.innerHTML = "";

    if (settings.youtubePrivacyModeEnabled) {
      // Use regular iframe for nocookie (CSP shouldn't be an issue)
      const iframe = document.createElement("iframe");
      iframe.src = getEmbedUrl(trailer);
      iframe.width = "693";
      iframe.height = "390";
      iframe.allowFullscreen = true;
      iframe.allow = "fullscreen; encrypted-media;";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.style.border = "none";
      iframe.title = formatTrailerTitle(trailer);
      container.appendChild(iframe);
    } else {
      // Use GM_addElement to bypass CSP for regular YouTube
      GM_addElement(container, "iframe", {
        src: getEmbedUrl(trailer),
        width: "693",
        height: "390",
        allowFullScreen: "true",
        allow: "fullscreen; encrypted-media;",
        referrerpolicy: "strict-origin-when-cross-origin",
        style: "border: none;",
        title: formatTrailerTitle(trailer),
      });
    }
  };

  // Update iframe when trailer selection changes
  useEffect(() => {
    if (iframeContainer && trailerData.trailers.length > 0 && trailerData.trailers[selectedTrailerIndex]) {
      createIframe(iframeContainer, trailerData.trailers[selectedTrailerIndex]);
    }
  }, [selectedTrailerIndex, trailerData.trailers, iframeContainer, settings.youtubePrivacyModeEnabled]);

  return (
    <div className="box">
      <div className="head">
        <strong>Trailer</strong>
        {!trailersAsync.loading && trailerData.trailers.length > 1 && (
          <select
            name="trailers"
            id="abtexr-trailer-selection"
            ml="10px"
            p="2px"
            max-w="90%"
            value={selectedTrailerIndex}
            onChange={handleTrailerChange}
          >
            {trailerData.trailers.map((trailer, index) => (
              <option key={trailer.id} value={index}>
                {formatTrailerTitle(trailer)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div flex justify="center" min-h="430px" items="center" className="body">
        {!hasInitialized || trailersAsync.loading ? (
          <div flex="~ col" items="center" justify="center">
            <div
              size-w-693px
              size-h-390px
              bg="[linear-gradient(90deg,#333_25%,#444_50%,#333_75%)]"
              animate="[shimmer]"
              rounded="4px"
              bg-size="[200%_100%]"
            />
            <div text-align="center" mt="20px" text="#888">
              Loading trailers...
            </div>
          </div>
        ) : trailersAsync.error ? (
          <div text-align="center" p="20px" text="#ef4444">
            Failed to load trailers
          </div>
        ) : trailerData.trailers.length === 0 ? (
          <div text-align="center" p="20px" text="#888">
            No trailers available
          </div>
        ) : (
          <div
            ref={(el) => {
              if (el && el !== iframeContainer) {
                setIframeContainer(el);
              }
            }}
            size-w-693px
            size-h-390px
          />
        )}
      </div>
      {trailersAsync.error && (
        <span text="red" block p="10px">
          {trailersAsync.error}
        </span>
      )}
    </div>
  );
}
