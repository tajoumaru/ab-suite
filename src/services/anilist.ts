import { apiRequest } from "@/lib/api";
import { cachedApiCall } from "@/lib/utils/cache";
import { log } from "@/lib/utils/logging";

export interface AniListMediaData {
  id: number;
  title: {
    english: string | null;
    native: string | null;
    romaji: string | null;
  };
  description: string | null;
  coverImage: {
    extraLarge: string | null;
    color: string | null;
  };
  bannerImage: string | null;
  averageScore: number | null;
  episodes: number | null;
  duration: number | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  countryOfOrigin: string | null;
  startDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  endDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  nextAiringEpisode: {
    airingAt: number | null;
    timeUntilAiring: number | null;
    episode: number | null;
  } | null;
  studios: {
    nodes: Array<{
      name: string;
    }>;
  };
  staff: {
    nodes: Array<{
      name: {
        full: string;
      };
      primaryOccupations: string[];
      image: {
        large: string | null;
      };
    }>;
  };
  characters: {
    edges: Array<{
      node: {
        name: {
          full: string;
          alternative: string[];
        };
        image: {
          large: string | null;
        };
      };
      voiceActorRoles: Array<{
        voiceActor: {
          name: {
            full: string;
          };
          image: {
            large: string | null;
          };
        };
      }>;
      role: string;
    }>;
  };
  stats: {
    scoreDistribution: Array<{
      score: number;
      amount: number;
    }>;
  };
  trailer: {
    id: string;
    site: string;
  } | null;
  relations: {
    edges: Array<{
      relationType: string;
      node: {
        title: {
          english: string | null;
          romaji: string | null;
        };
        type: string;
        source: string;
        format: string;
        startDate: {
          year: number | null;
        };
        coverImage: {
          extraLarge: string | null;
        };
      };
    }>;
  };
}

const ANILIST_MEDIA_QUERY = /*gql*/ `
query Media($mediaId: Int) {
  Media(id: $mediaId) {
    id
    title {
      english
      native
      romaji
    }
    description(asHtml: true)
    coverImage {
      extraLarge
      color
    }
    bannerImage
    averageScore
    episodes
    duration
    status
    season
    seasonYear
    countryOfOrigin
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
    studios {
      nodes {
        name
      }
    }
    staff {
      nodes {
        name {
          full
        }
        primaryOccupations
        image {
          large
        }
      }
    }
    characters(sort: ID) {
      edges {
        node {
          name {
            full
            alternative
          }
          image {
            large
          }
        }
        voiceActorRoles(language: JAPANESE) {
          voiceActor {
            name {
              full
            }
            image {
              large
            }
          }
        }
        role
      }
    }
    stats {
      scoreDistribution {
        score
        amount
      }
    }
    trailer {
      id
      site
    }
    relations {
      edges {
        relationType
        node {
          title {
            english
            romaji
          }
          type
          source
          format
          startDate {
            year
          }
          coverImage {
            extraLarge
          }
        }
      }
    }
  }
}
`;

export class AniListService {
  private static readonly ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

  /**
   * Fetch detailed media information from AniList using GraphQL
   */
  async fetchMediaData(mediaId: number): Promise<AniListMediaData | null> {
    const cacheKey = `anilist-media-${mediaId}`;

    try {
      const response = await cachedApiCall(
        cacheKey,
        () =>
          apiRequest<{ data: { Media: AniListMediaData }; errors?: any[] }>({
            method: "POST",
            url: AniListService.ANILIST_GRAPHQL_URL,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            data: {
              query: ANILIST_MEDIA_QUERY,
              variables: { mediaId },
            },
            responseType: "json",
          }).then((data) => {
            if (data.errors) {
              log("AniList GraphQL errors:", data.errors);
              return null;
            }
            return data;
          }),
        {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          failureTtl: 60 * 60 * 1000, // 1 hour for failures
          apiKey: "anilist",
        },
      ).catch((error) => {
        log("Failed to fetch AniList data", error);
        return null;
      });

      return response?.data?.Media || null;
    } catch (error) {
      log("Failed to fetch AniList media data", error);
      return null;
    }
  }

  /**
   * Format date from AniList date object to readable string
   */
  formatDate(dateObj: { year: number | null; month: number | null; day: number | null } | null): string | null {
    if (!dateObj || !dateObj.year) return null;

    const year = dateObj.year;
    const month = dateObj.month ? String(dateObj.month).padStart(2, "0") : "01";
    const day = dateObj.day ? String(dateObj.day).padStart(2, "0") : "01";

    return `${year}-${month}-${day}`;
  }

  /**
   * Format season and year for display
   */
  formatSeasonYear(season: string | null, seasonYear: number | null): string | null {
    if (!season || !seasonYear) return null;

    const seasonCapitalized = season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();
    return `${seasonCapitalized} ${seasonYear}`;
  }

  /**
   * Format studios list for display
   */
  formatStudios(studios: { nodes: Array<{ name: string }> }): string {
    return studios.nodes.map((studio) => studio.name).join(", ");
  }

  /**
   * Get primary staff members filtered by role
   */
  getPrimaryStaff(staff: {
    nodes: Array<{ name: { full: string }; primaryOccupations: string[] }>;
  }): Array<{ name: string; role: string }> {
    const primaryRoles = ["Director", "Scriptwriter", "Character Design", "Music", "Producer"];

    return staff.nodes
      .filter((member) => member.primaryOccupations.some((occupation) => primaryRoles.includes(occupation)))
      .map((member) => ({
        name: member.name.full,
        role:
          member.primaryOccupations.find((occupation) => primaryRoles.includes(occupation)) ||
          member.primaryOccupations[0] ||
          "Staff",
      }));
  }

  /**
   * Get main and supporting characters with their voice actors
   */
  getMainCharacters(characters: AniListMediaData["characters"]): Array<{
    name: string;
    alternativeNames: string[];
    role: string;
    image: string | null;
    voiceActor: {
      name: string;
      image: string | null;
    } | null;
  }> {
    return characters.edges
      .filter((edge) => edge.role === "MAIN" || edge.role === "SUPPORTING")
      .map((edge) => ({
        name: edge.node.name.full,
        alternativeNames: edge.node.name.alternative || [],
        role: edge.role,
        image: edge.node.image.large,
        voiceActor:
          edge.voiceActorRoles.length > 0
            ? {
                name: edge.voiceActorRoles[0].voiceActor.name.full,
                image: edge.voiceActorRoles[0].voiceActor.image.large,
              }
            : null,
      }))
      .sort((a, b) => {
        // Sort by role (MAIN first, then SUPPORTING)
        if (a.role === "MAIN" && b.role !== "MAIN") return -1;
        if (a.role !== "MAIN" && b.role === "MAIN") return 1;
        return 0;
      });
  }

  /**
   * Fetch basic rating data for compatibility with useRatings hook
   */
  async fetchRatingData(anilistId: number): Promise<{
    data: {
      Media: {
        id: number;
        averageScore: number | null;
        popularity: number | null;
        stats: {
          scoreDistribution: Array<{
            score: number;
            amount: number;
          }>;
        } | null;
      };
    };
  } | null> {
    const cacheKey = `anilist-rating-${anilistId}`;

    const query = /*gql*/ `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          averageScore
          popularity
          stats {
            scoreDistribution {
              score
              amount
            }
          }
        }
      }
    `;

    const variables = { id: anilistId };

    return cachedApiCall(
      cacheKey,
      () =>
        apiRequest<{
          data: {
            Media: {
              id: number;
              averageScore: number | null;
              popularity: number | null;
              stats: {
                scoreDistribution: Array<{
                  score: number;
                  amount: number;
                }>;
              } | null;
            };
          };
          errors?: any[];
        }>({
          method: "POST",
          url: AniListService.ANILIST_GRAPHQL_URL,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          data: { query, variables },
          responseType: "json",
        }).then((data) => {
          if (data.errors) {
            log("AniList GraphQL errors:", data.errors);
            return null;
          }
          return data;
        }),
      {
        ttl: 12 * 60 * 60 * 1000, // 12 hours - AniList updates more frequently
        failureTtl: 2 * 60 * 60 * 1000, // 2 hours for failures
        apiKey: "anilist",
      },
    ).catch((error) => {
      log("Failed to fetch AniList data", error);
      return null;
    });
  }
}

export const aniListService = new AniListService();
