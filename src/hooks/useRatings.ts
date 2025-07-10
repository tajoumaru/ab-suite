import type { AnimeApiResponse, MediaInfo } from "@/modules/animebytes/hooks/useMediaInfo";
import {
  fetchAnidbData,
  fetchAnilistData,
  fetchImdbData,
  fetchKitsuData,
  fetchMyAnimeListData,
  fetchTmdbData,
} from "@/services/externalApis";
import { useAsync } from "./useAsync";

export interface PlatformRating {
  platform: string;
  score: number | null;
  maxScore: number;
  votes: number | null;
  rank?: number | null;
  detailsUrl?: string;
  loading: boolean;
  error: boolean;
}

export interface RatingsData {
  ratings: PlatformRating[];
  isLoading: boolean;
  hasError: boolean;
}

export function useRatings(apiData: AnimeApiResponse, mediaInfo?: MediaInfo, tmdbApiToken?: string): RatingsData {
  const ratingsAsync = useAsync(
    async (): Promise<PlatformRating[]> => {
      const initialRatings: PlatformRating[] = [
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
      ];

      const updatedRatings = [...initialRatings];

      // Helper function to update specific platform rating
      const updatePlatformRating = (platformIndex: number, updates: Partial<PlatformRating>) => {
        updatedRatings[platformIndex] = { ...updatedRatings[platformIndex], ...updates };
      };

      // Fetch all ratings concurrently
      const promises: Promise<void>[] = [];

      // AnimeBytes - use rating from mediaInfo if available
      if (mediaInfo?.siteRating && mediaInfo?.siteVotes) {
        updatePlatformRating(0, {
          score: mediaInfo.siteRating,
          votes: mediaInfo.siteVotes,
          detailsUrl: undefined,
          loading: false,
          error: false,
        });
      }

      // AniList
      if (apiData.anilist) {
        promises.push(
          fetchAnilistData(apiData.anilist)
            .then((anilistData) => {
              if (anilistData?.data?.Media) {
                const normalizedScore = anilistData.data.Media.averageScore
                  ? anilistData.data.Media.averageScore / 10
                  : null;

                // Calculate total votes from scoreDistribution
                let totalVotes: number | null = null;
                if (anilistData.data.Media.stats?.scoreDistribution) {
                  totalVotes = anilistData.data.Media.stats.scoreDistribution.reduce(
                    (sum, item) => sum + item.amount,
                    0,
                  );
                }

                updatePlatformRating(1, {
                  score: normalizedScore,
                  votes: totalVotes,
                  detailsUrl: `https://anilist.co/anime/${apiData.anilist}`,
                  loading: false,
                  error: false,
                });
              } else {
                updatePlatformRating(1, { loading: false, error: true });
              }
            })
            .catch(() => {
              updatePlatformRating(1, { loading: false, error: true });
            }),
        );
      }

      // MyAnimeList
      if (apiData.myanimelist) {
        promises.push(
          fetchMyAnimeListData(apiData.myanimelist)
            .then((malData) => {
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
            })
            .catch(() => {
              updatePlatformRating(2, { loading: false, error: true });
            }),
        );
      }

      // IMDb
      if (apiData.imdb) {
        promises.push(
          fetchImdbData(apiData.imdb?.startsWith("tt") ? apiData.imdb : `tt${apiData.imdb}`)
            .then((imdbData) => {
              if (imdbData?.aggregateRating) {
                const imdbId = apiData.imdb?.startsWith("tt") ? apiData.imdb : `tt${apiData.imdb}`;
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
            })
            .catch(() => {
              updatePlatformRating(3, { loading: false, error: true });
            }),
        );
      }

      // Kitsu
      if (apiData.kitsu) {
        if (mediaInfo?.kitsuRating) {
          const normalizedScore = mediaInfo.kitsuRating / 10;
          updatePlatformRating(4, {
            score: normalizedScore,
            votes: mediaInfo.kitsuVotes,
            detailsUrl: `https://kitsu.app/anime/${apiData.kitsu}`,
            loading: false,
            error: false,
          });
        } else {
          promises.push(
            fetchKitsuData(apiData.kitsu)
              .then((kitsuData) => {
                if (kitsuData?.data?.attributes) {
                  const averageRating = kitsuData.data.attributes.averageRating
                    ? parseFloat(kitsuData.data.attributes.averageRating)
                    : null;

                  let totalVotes = 0;
                  if (kitsuData.data.attributes.ratingFrequencies) {
                    totalVotes = Object.values(kitsuData.data.attributes.ratingFrequencies).reduce(
                      (sum, count) => sum + parseInt(count, 10),
                      0,
                    );
                  }

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
              })
              .catch(() => {
                updatePlatformRating(4, { loading: false, error: true });
              }),
          );
        }
      }

      // TMDb
      if (apiData.themoviedb && tmdbApiToken) {
        promises.push(
          fetchTmdbData(apiData.themoviedb, mediaInfo?.searchMediaType === "anime" ? "tv" : "movie", tmdbApiToken)
            .then((tmdbData) => {
              if (tmdbData) {
                const mediaType = mediaInfo?.searchMediaType === "anime" ? "tv" : "movie";
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
            })
            .catch(() => {
              updatePlatformRating(5, { loading: false, error: true });
            }),
        );
      }

      // AniDB
      if (apiData.anidb) {
        promises.push(
          fetchAnidbData(apiData.anidb)
            .then((anidbData) => {
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
            })
            .catch(() => {
              updatePlatformRating(6, { loading: false, error: true });
            }),
        );
      }

      // Wait for all promises to complete
      await Promise.allSettled(promises);

      return updatedRatings;
    },
    {
      deps: [apiData, mediaInfo, tmdbApiToken],
    },
  );

  const ratings = ratingsAsync.data || [];
  const isLoading = ratingsAsync.loading;
  const hasError = !!ratingsAsync.error;

  return {
    ratings,
    isLoading,
    hasError,
  };
}
