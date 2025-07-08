import { useEffect, useState } from "preact/hooks";
import {
  fetchAnidbData,
  fetchAnilistData,
  fetchImdbData,
  fetchKitsuData,
  fetchMyAnimeListData,
  fetchTmdbData,
} from "@/services/externalApis";
import { useSettingsStore } from "@/stores/settings";
import type { AnimeApiResponse, MediaInfo } from "../hooks/useMediaInfo";

// Rating Data Interface
interface PlatformRating {
  platform: string;
  score: number | null;
  maxScore: number;
  votes: number | null;
  rank?: number | null;
  detailsUrl?: string;
  loading: boolean;
  error: boolean;
}

interface RatingsProps {
  apiData: AnimeApiResponse;
  mediaInfo?: MediaInfo;
}

const PLATFORM_ICONS = {
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
  const [ratings, setRatings] = useState<PlatformRating[]>([
    {
      platform: "AnimeBytes",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "AniList",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "MyAnimeList",
      score: null,
      maxScore: 10,
      votes: null,
      rank: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "IMDb",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "Kitsu",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "TMDb",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
    {
      platform: "AniDB",
      score: null,
      maxScore: 10,
      votes: null,
      detailsUrl: undefined,
      loading: false,
      error: false,
    },
  ]);

  // Update a specific platform's rating
  const updatePlatformRating = (platformIndex: number, updates: Partial<PlatformRating>) => {
    setRatings((prev) => prev.map((rating, index) => (index === platformIndex ? { ...rating, ...updates } : rating)));
  };

  // Fetch all ratings
  useEffect(() => {
    const fetchAllRatings = async () => {
      // AnimeBytes - use rating from mediaInfo if available
      if (mediaInfo?.siteRating && mediaInfo?.siteVotes) {
        updatePlatformRating(0, {
          score: mediaInfo.siteRating,
          votes: mediaInfo.siteVotes,
          detailsUrl: undefined, // No external link for site's own rating
          loading: false,
          error: false,
        });
      }

      // AniList
      if (apiData.anilist) {
        updatePlatformRating(1, { loading: true });
        const anilistData = await fetchAnilistData(apiData.anilist);
        if (anilistData?.data?.Media) {
          // Convert AniList score from 0-100 to 0-10 scale
          const normalizedScore = anilistData.data.Media.averageScore ? anilistData.data.Media.averageScore / 10 : null;

          updatePlatformRating(1, {
            score: normalizedScore,
            votes: anilistData.data.Media.popularity,
            detailsUrl: `https://anilist.co/anime/${apiData.anilist}`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(1, { loading: false, error: true });
        }
      }

      // MyAnimeList
      if (apiData.myanimelist) {
        updatePlatformRating(2, { loading: true });
        const malData = await fetchMyAnimeListData(apiData.myanimelist);
        if (malData?.data) {
          updatePlatformRating(2, {
            score: malData.data.score,
            votes: malData.data.scored_by,
            rank: malData.data.rank,
            detailsUrl: `${malData.data.url}/stats`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(2, { loading: false, error: true });
        }
      }

      // IMDb - use direct IMDb ID only
      if (apiData.imdb) {
        updatePlatformRating(3, { loading: true });

        const imdbId = apiData.imdb.startsWith("tt") ? apiData.imdb : `tt${apiData.imdb}`;
        const imdbData = await fetchImdbData(imdbId);
        if (imdbData?.aggregateRating) {
          updatePlatformRating(3, {
            score: imdbData.aggregateRating.ratingValue,
            votes: imdbData.aggregateRating.ratingCount,
            detailsUrl: `https://www.imdb.com/title/${imdbId}/ratings/`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(3, { loading: false, error: true });
        }
      }

      // Kitsu - use rating from mediaInfo if available
      if (apiData.kitsu) {
        updatePlatformRating(4, { loading: true });

        if (mediaInfo?.kitsuRating) {
          // Use the rating already fetched by useMediaInfo
          // Convert Kitsu score from 0-100 to 0-10 scale
          const normalizedScore = mediaInfo.kitsuRating / 10;

          updatePlatformRating(4, {
            score: normalizedScore,
            votes: mediaInfo.kitsuVotes,
            detailsUrl: `https://kitsu.app/anime/${apiData.kitsu}`,
            loading: false,
            error: false,
          });
        } else {
          // Fallback to fetching separately
          const kitsuData = await fetchKitsuData(apiData.kitsu);
          if (kitsuData?.data?.attributes) {
            const averageRating = kitsuData.data.attributes.averageRating
              ? parseFloat(kitsuData.data.attributes.averageRating)
              : null;

            // Calculate total votes from rating frequencies
            let totalVotes = 0;
            if (kitsuData.data.attributes.ratingFrequencies) {
              totalVotes = Object.values(kitsuData.data.attributes.ratingFrequencies).reduce(
                (sum, count) => sum + parseInt(count, 10),
                0,
              );
            }

            // Convert Kitsu score from 0-100 to 0-10 scale
            const normalizedScore = averageRating ? averageRating / 10 : null;

            updatePlatformRating(4, {
              score: normalizedScore,
              votes: totalVotes || null,
              detailsUrl: `https://kitsu.app/anime/${apiData.kitsu}`,
              loading: false,
              error: false,
            });
          } else {
            updatePlatformRating(4, { loading: false, error: true });
          }
        }
      }

      // TMDB - check if we have TMDB ID in API data
      if (apiData.themoviedb && settings.tmdbApiToken) {
        updatePlatformRating(5, { loading: true });
        // For anime, we assume it's a TV show unless specified otherwise
        const mediaType = mediaInfo?.searchMediaType === "anime" ? "tv" : "movie";
        const tmdbData = await fetchTmdbData(apiData.themoviedb, mediaType, settings.tmdbApiToken);
        if (tmdbData) {
          updatePlatformRating(5, {
            score: tmdbData.vote_average,
            votes: tmdbData.vote_count,
            detailsUrl: `https://www.themoviedb.org/${mediaType}/${apiData.themoviedb}`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(5, { loading: false, error: true });
        }
      }

      // AniDB
      if (apiData.anidb) {
        updatePlatformRating(6, { loading: true });
        const anidbData = await fetchAnidbData(apiData.anidb);
        if (anidbData) {
          updatePlatformRating(6, {
            score: anidbData.rating,
            votes: anidbData.votes,
            detailsUrl: `https://anidb.net/anime/${apiData.anidb}/vote/statistic`,
            loading: false,
            error: false,
          });
        } else {
          updatePlatformRating(6, { loading: false, error: true });
        }
      }
    };

    fetchAllRatings();
  }, [apiData, mediaInfo, settings.tmdbApiToken]);

  // Format score for display (always out of 10 with 2 decimal places)
  const formatScore = (score: number | null) => {
    if (score === null) return "N/A";
    return score.toFixed(2);
  };

  // Format votes/stats for display with platform-specific labels
  const formatVotesDisplay = (votes: number | null, platform: string) => {
    if (votes === null) return "N/A";

    let formattedNumber: string;
    if (votes >= 1000000) {
      formattedNumber = `${(votes / 1000000).toFixed(1)}M`;
    } else if (votes >= 1000) {
      formattedNumber = `${(votes / 1000).toFixed(1)}K`;
    } else {
      formattedNumber = votes.toString();
    }

    // Use platform-specific labels
    if (platform === "AniList") {
      return `${formattedNumber} saved`;
    }
    return `${formattedNumber} votes`;
  };

  return (
    <div className="ab-ratings box">
      <div className="head">Ratings</div>
      <div className="ab-ratings-grid body">
        {ratings.map((rating) => (
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
                    src={PLATFORM_ICONS[rating.platform as keyof typeof PLATFORM_ICONS]}
                    alt={rating.platform}
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
                  src={PLATFORM_ICONS[rating.platform as keyof typeof PLATFORM_ICONS]}
                  alt={rating.platform}
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
                  <div className="ab-rating-score">
                    <span className="ab-score-value">{formatScore(rating.score)}</span>
                    <span className="ab-score-max"> / 10</span>
                  </div>
                  <div className="ab-rating-details">
                    <div className="ab-rating-votes">{formatVotesDisplay(rating.votes, rating.platform)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
