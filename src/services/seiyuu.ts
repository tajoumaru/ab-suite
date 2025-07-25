import { cachedApiCall } from "@/utils/cache";
import { log } from "@/utils/logging";

export interface AniListSeiyuuData {
  image: {
    large: string | null;
  };
  name: {
    native: string | null;
  };
  description: string | null;
  age: number | null;
  bloodType: string | null;
  dateOfBirth: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  gender: string | null;
  dateOfDeath: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  homeTown: string | null;
  primaryOccupations: string[] | null;
  yearsActive: number[] | null;
}

const ANILIST_SEIYUU_QUERY = /*gql*/ `
query Character($search: String) {
  Staff(search: $search) {
    image {
      large
    }
    name {
      native
    }
    description
    age
    bloodType
    dateOfBirth {
      year
      month
      day
    }
    gender
    dateOfDeath {
      year
      month
      day
    }
    homeTown
    primaryOccupations
    yearsActive
  }
}
`;

export class SeiyuuService {
  private static readonly ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

  /**
   * Search for seiyuu on AniList by name
   */
  async searchAniListSeiyuu(searchTerm: string): Promise<AniListSeiyuuData | null> {
    const cacheKey = `anilist-seiyuu-${searchTerm}`;

    try {
      const response = await cachedApiCall(
        cacheKey,
        () =>
          new Promise<{ data: { Staff: AniListSeiyuuData } } | null>((resolve) => {
            GM_xmlhttpRequest({
              method: "POST",
              url: SeiyuuService.ANILIST_GRAPHQL_URL,
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              data: JSON.stringify({
                query: ANILIST_SEIYUU_QUERY,
                variables: { search: searchTerm },
              }),
              onload: (response) => {
                if (response.status === 200) {
                  try {
                    const data = JSON.parse(response.responseText);
                    if (data.errors || !data.data?.Staff) {
                      log("AniList Seiyuu search returned no results for:", searchTerm);
                      resolve(null);
                    } else {
                      resolve(data);
                    }
                  } catch (error) {
                    log("Failed to parse AniList seiyuu response", error);
                    resolve(null);
                  }
                } else {
                  log("AniList Seiyuu API returned status", response.status);
                  resolve(null);
                }
              },
              onerror: () => {
                log("Failed to fetch AniList seiyuu data");
                resolve(null);
              },
            });
          }),
        {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          failureTtl: 60 * 60 * 1000, // 1 hour for failures
          apiKey: "anilist-seiyuu",
        },
      );

      return response?.data?.Staff || null;
    } catch (error) {
      log("Failed to search AniList seiyuu", error);
      return null;
    }
  }

  /**
   * Main method to fetch seiyuu metadata
   */
  async fetchSeiyuuMetadata(seiyuuName: string): Promise<{
    source: "anilist";
    data: AniListSeiyuuData;
  } | null> {
    log("Fetching seiyuu metadata for:", seiyuuName);

    const anilistData = await this.searchAniListSeiyuu(seiyuuName);
    if (anilistData) {
      log("Found seiyuu on AniList:", anilistData.name.native || "Unknown");
      return { source: "anilist", data: anilistData };
    }

    log("No seiyuu found on AniList for:", seiyuuName);
    return null;
  }
}

export const seiyuuService = new SeiyuuService();
