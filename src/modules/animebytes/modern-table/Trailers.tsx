import { useEffect, useState } from "preact/hooks";
import { fetchAllTrailers, type Trailer, type TrailerCollection } from "@/services/trailers";
import { useSettingsStore } from "@/stores/settings";
import type { AnimeApiResponse, MediaInfo } from "../hooks/useMediaInfo";

interface TrailersProps {
  apiData: AnimeApiResponse;
  mediaInfo?: MediaInfo;
}

export function Trailers({ apiData, mediaInfo }: TrailersProps) {
  const settings = useSettingsStore();
  const [trailerData, setTrailerData] = useState<TrailerCollection>({
    trailers: [],
    loading: true,
    error: false,
  });
  const [selectedTrailerIndex, setSelectedTrailerIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrailers = async () => {
      if (!apiData.myanimelist && !apiData.themoviedb) {
        setTrailerData({
          trailers: [],
          loading: false,
          error: false,
        });
        return;
      }

      try {
        setTrailerData((prev) => ({ ...prev, loading: true }));

        const result = await fetchAllTrailers(
          {
            myanimelist: apiData.myanimelist || undefined,
            themoviedb: apiData.themoviedb || undefined,
          },
          mediaInfo?.searchMediaType || "anime",
          settings.tmdbApiToken,
          settings.youtubeApiKey,
        );

        setTrailerData(result);
      } catch (error) {
        console.error("AB Suite: Failed to load trailers", error);
        setTrailerData({
          trailers: [],
          loading: false,
          error: true,
        });
      }
    };

    loadTrailers();
  }, [
    apiData.myanimelist,
    apiData.themoviedb,
    mediaInfo?.searchMediaType,
    settings.tmdbApiToken,
    settings.youtubeApiKey,
  ]);

  // Don't render if no trailers and not loading
  if (!trailerData.loading && trailerData.trailers.length === 0 && !trailerData.error) {
    return null;
  }

  const formatTrailerTitle = (trailer: Trailer) => {
    // Use the trailer name as-is, without adding provider info
    // The legacy code doesn't show provider info in dropdown
    return trailer.name;
  };

  const getEmbedUrl = (trailer: Trailer) => {
    // Use youtube-nocookie for better privacy
    return `https://www.youtube-nocookie.com/embed/${trailer.youtubeId}?VQ=HD1080&rel=0&loop=1`;
  };

  const handleTrailerChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    setSelectedTrailerIndex(parseInt(target.value));
    setError(null); // Reset error when changing trailer
  };

  // Reset selected index when trailers change
  useEffect(() => {
    if (trailerData.trailers.length > 0 && selectedTrailerIndex >= trailerData.trailers.length) {
      setSelectedTrailerIndex(0);
    }
  }, [trailerData.trailers.length, selectedTrailerIndex]);

  return (
    <div className="box">
      <div className="head">
        <strong>Trailer</strong>
        {!trailerData.loading && trailerData.trailers.length > 1 && (
          <select
            name="trailers"
            id="abtexr-trailer-selection"
            style={{ marginLeft: "10px", padding: "2px", maxWidth: "90%" }}
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
      <div className="body" style={{ display: "flex", justifyContent: "center" }}>
        {trailerData.loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>Loading trailers...</div>
        ) : trailerData.error ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#ef4444" }}>Failed to load trailers</div>
        ) : trailerData.trailers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>No trailers available</div>
        ) : (
          <iframe
            src={getEmbedUrl(trailerData.trailers[selectedTrailerIndex])}
            width="693"
            height="390"
            allowFullScreen
            allow="fullscreen;"
            style={{ border: "none" }}
            title={formatTrailerTitle(trailerData.trailers[selectedTrailerIndex])}
          />
        )}
      </div>
      {error && <span style={{ color: "red", display: "block", padding: "10px" }}>{error}</span>}
    </div>
  );
}
