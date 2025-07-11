import { useEffect, useState } from "preact/hooks";
import { useRatings } from "@/hooks/useRatings";
import { useSettingsStore } from "@/stores/settings";
import type { AnimeApiResponse, MediaInfo } from "../hooks/useMediaInfo";

interface RatingsProps {
  apiData: AnimeApiResponse;
  mediaInfo?: MediaInfo;
}

const PLATFORM_ICONS = {
  "Weighted Average": "https://mei.kuudere.pw/91pBt8eMes0.jpg",
  MyAnimeList: "https://mei.kuudere.pw/6oHQTbmDfrs.png",
  AniDB: "https://mei.kuudere.pw/iiD0CGjgEl7.png",
  AniList: "https://mei.kuudere.pw/h7552tISkKb.png",
  Kitsu: "https://mei.kuudere.pw/fjJ7w593D8o.png",
  TMDb: "https://mei.kuudere.pw/Cg5yNKBvz3E.png",
  IMDb: "https://mei.kuudere.pw/gtY9cKsJV77.png",
  AnimeBytes: "https://mei.kuudere.pw/ubPI4dVDXWO.png",
};

export function Ratings({ apiData, mediaInfo }: RatingsProps) {
  const settings = useSettingsStore();
  const { ratings } = useRatings(apiData, mediaInfo, settings.tmdbApiToken);

  // Track if this is the first render to show loading state immediately
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    setHasInitialized(true);
  }, []);

  // Tooltip explaining the weighted average algorithm
  const weightedAverageTooltip = `Weighted Average Algorithm:

Source Authority Weights:
• AnimeBytes: 3.0× (Highest Voting Quality)
• Anime sites (AniList, MAL, Kitsu, AniDB): 2.0×
• General sites (TMDb, IMDb): 1.0×

Vote Influence:
Uses simple vote-weighted averaging with authority weights.
Formula: (score × votes × sourceWeight) / (votes × sourceWeight)

Each vote is weighted by the platform's authority, creating a natural balance between vote count and source reliability.`;

  // Filter out platforms that don't have valid data
  const validRatings = ratings.filter((rating) => {
    // Hide platforms that are in error state
    if (rating.error) return false;

    // Hide platforms that don't have a score (but allow loading state to show)
    if (!rating.loading && rating.score === null) return false;

    return true;
  });

  // Calculate weighted average rating
  const calculateWeightedAverage = () => {
    const completedRatings = validRatings.filter((r) => !r.loading && r.score !== null && r.votes !== null);

    if (completedRatings.length === 0) return null;

    // Source authority weights
    const sourceWeights: Record<string, number> = {
      AnimeBytes: 3.0, // Highest authority for anime torrents
      AniList: 2.0, // Anime-specific sites
      MyAnimeList: 2.0,
      Kitsu: 2.0,
      AniDB: 2.0,
      TMDb: 1.0, // Generic movie/TV sites
      IMDb: 1.0,
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let totalVotes = 0;

    for (const rating of completedRatings) {
      const sourceWeight = sourceWeights[rating.platform] || 1.0;
      const votes = rating.votes || 0;

      // Simple vote-weighted average: score * votes * authority weight
      const weightedScore = (rating.score || 0) * votes * sourceWeight;
      const weightedVotes = votes * sourceWeight;

      totalWeightedScore += weightedScore;
      totalWeight += weightedVotes;
      totalVotes += votes;
    }

    const finalScore = totalWeightedScore / totalWeight;

    return {
      score: finalScore,
      votes: totalVotes,
      platform: "Weighted Average",
      maxScore: 10,
      rank: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    };
  };

  // Sort ratings by vote count (descending), but keep loading states at the end
  const sortedRatings = [...validRatings].sort((a, b) => {
    // Keep loading states at the end
    if (a.loading && !b.loading) return 1;
    if (!a.loading && b.loading) return -1;
    if (a.loading && b.loading) return 0;

    // Sort by vote count (descending)
    const aVotes = a.votes || 0;
    const bVotes = b.votes || 0;
    return bVotes - aVotes;
  });

  // Add weighted average at the front if we have completed ratings
  const weightedAverage = calculateWeightedAverage();
  const finalRatings = weightedAverage ? [weightedAverage, ...sortedRatings] : sortedRatings;

  // Format score for display (always out of 10 with 2 decimal places)
  const formatScore = (score: number | null) => {
    if (score === null) return "N/A";
    return score.toFixed(2);
  };

  // Format votes/stats for display with consistent labeling
  const formatVotesDisplay = (votes: number | null) => {
    if (votes === null) return "N/A";

    let formattedNumber: string;
    if (votes >= 1000000) {
      formattedNumber = `${(votes / 1000000).toFixed(1)}M`;
    } else if (votes >= 1000) {
      formattedNumber = `${(votes / 1000).toFixed(1)}K`;
    } else {
      formattedNumber = votes.toString();
    }

    // Use consistent "votes" labeling for all platforms
    return `${formattedNumber} votes`;
  };

  // Show loading state immediately with proper structure
  // On first render (!hasInitialized), always show loading
  // After initialization, check actual loading state
  const isInitialLoading = !hasInitialized || ratings.every((r) => r.loading);

  return (
    <div className="ab-ratings box">
      <div className="head">Ratings</div>
      <div className="ab-ratings-grid body">
        {isInitialLoading ? (
          // Show loading cards to maintain layout during initial load
          ["MyAnimeList", "AniList", "AniDB", "Kitsu", "TMDb", "IMDb"].map((platform) => (
            <div key={`loading-${platform}`} className="ab-rating-card">
              <div className="ab-rating-header">
                <div className="ab-rating-platform-skeleton" />
              </div>
              <div className="ab-rating-content">
                <div className="ab-rating-loading">Loading...</div>
              </div>
            </div>
          ))
        ) : finalRatings.length === 0 ? (
          <div className="ab-ratings-empty">No ratings available</div>
        ) : (
          finalRatings.map((rating) => {
            const iconSrc = PLATFORM_ICONS[rating.platform as keyof typeof PLATFORM_ICONS];
            const isWeightedAverage = rating.platform === "Weighted Average";

            return (
              <div key={rating.platform} className="ab-rating-card">
                <div className="ab-rating-header">
                  {rating.detailsUrl ? (
                    <a
                      href={rating.detailsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ab-rating-details-link"
                      title={`View detailed ${rating.platform} statistics`}
                    >
                      <img
                        className="ab-rating-platform-icon"
                        src={iconSrc}
                        alt={rating.platform}
                        title={isWeightedAverage ? weightedAverageTooltip : undefined}
                        onError={(e) => {
                          // Fallback for missing icons - show platform name instead
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = "none";
                          const fallbackSpan = document.createElement("span");
                          fallbackSpan.textContent = rating.platform;
                          fallbackSpan.className = "ab-platform-name-fallback";
                          target.parentNode?.appendChild(fallbackSpan);
                        }}
                      />
                    </a>
                  ) : (
                    <img
                      className="ab-rating-platform-icon"
                      src={iconSrc}
                      alt={rating.platform}
                      title={isWeightedAverage ? weightedAverageTooltip : undefined}
                      onError={(e) => {
                        // Fallback for missing icons - show platform name instead
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        const fallbackSpan = document.createElement("span");
                        fallbackSpan.textContent = rating.platform;
                        fallbackSpan.className = "ab-platform-name-fallback";
                        target.parentNode?.appendChild(fallbackSpan);
                      }}
                    />
                  )}
                </div>
                <div className="ab-rating-content">
                  {rating.loading ? (
                    <div className="ab-rating-loading">Loading...</div>
                  ) : rating.error ? (
                    <div className="ab-rating-error">Error</div>
                  ) : (
                    <>
                      <div className="ab-rating-score" title={isWeightedAverage ? weightedAverageTooltip : undefined}>
                        <span className="ab-score-value">{formatScore(rating.score)}</span>
                        <span className="ab-score-max"> / 10</span>
                      </div>
                      <div className="ab-rating-details">
                        <div className="ab-rating-votes">{formatVotesDisplay(rating.votes)}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
