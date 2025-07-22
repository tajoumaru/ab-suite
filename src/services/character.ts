import { cachedApiCall } from "@/utils/cache";
import { log } from "@/utils/logging";

export interface AniListCharacterData {
  image: {
    large: string | null;
  };
  name: {
    native: string | null;
    alternative: string[] | null;
  };
  description: string | null;
  age: string | null;
  bloodType: string | null;
  dateOfBirth: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  gender: string | null;
}

export interface MalCharacterData {
  mal_id: number;
  name: string;
  name_kanji: string | null;
  images: {
    jpg: {
      image_url: string;
    };
    webp: {
      image_url: string;
    };
  };
  about: string | null;
}

export interface MalResponse {
  data: MalCharacterData[];
}

const ANILIST_CHARACTER_QUERY = /*gql*/ `
query Character($search: String) {
  Character(search: $search) {
    image {
      large
    }
    name {
      native
      alternative
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
  }
}
`;

export class CharacterService {
  private static readonly ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
  private static readonly MAL_API_URL = "https://api.jikan.moe/v4";

  /**
   * Search for character on AniList by name
   */
  async searchAniListCharacter(searchTerm: string): Promise<AniListCharacterData | null> {
    const cacheKey = `anilist-character-${searchTerm}`;

    try {
      const response = await cachedApiCall(
        cacheKey,
        () =>
          new Promise<{ data: { Character: AniListCharacterData } } | null>((resolve) => {
            GM_xmlhttpRequest({
              method: "POST",
              url: CharacterService.ANILIST_GRAPHQL_URL,
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              data: JSON.stringify({
                query: ANILIST_CHARACTER_QUERY,
                variables: { search: searchTerm },
              }),
              onload: (response) => {
                if (response.status === 200) {
                  try {
                    const data = JSON.parse(response.responseText);
                    if (data.errors || !data.data?.Character) {
                      log("AniList Character search returned no results for:", searchTerm);
                      resolve(null);
                    } else {
                      resolve(data);
                    }
                  } catch (error) {
                    log("Failed to parse AniList character response", error);
                    resolve(null);
                  }
                } else {
                  log("AniList Character API returned status", response.status);
                  resolve(null);
                }
              },
              onerror: () => {
                log("Failed to fetch AniList character data");
                resolve(null);
              },
            });
          }),
        {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          failureTtl: 60 * 60 * 1000, // 1 hour for failures
          apiKey: "anilist-character",
        },
      );

      return response?.data?.Character || null;
    } catch (error) {
      log("Failed to search AniList character", error);
      return null;
    }
  }

  /**
   * Search for character on MAL/Jikan API
   */
  async searchMalCharacter(searchTerm: string): Promise<MalCharacterData | null> {
    const cacheKey = `mal-character-${searchTerm}`;

    try {
      const response = await cachedApiCall(
        cacheKey,
        () =>
          new Promise<MalResponse | null>((resolve) => {
            const encodedQuery = encodeURIComponent(searchTerm);
            const url = `${CharacterService.MAL_API_URL}/characters?q=${encodedQuery}&limit=1`;

            GM_xmlhttpRequest({
              method: "GET",
              url,
              headers: {
                Accept: "application/json",
              },
              onload: (response) => {
                if (response.status === 200) {
                  try {
                    const data: MalResponse = JSON.parse(response.responseText);
                    if (!data.data || data.data.length === 0) {
                      log("MAL Character search returned no results for:", searchTerm);
                      resolve(null);
                    } else {
                      resolve(data);
                    }
                  } catch (error) {
                    log("Failed to parse MAL character response", error);
                    resolve(null);
                  }
                } else {
                  log("MAL Character API returned status", response.status);
                  resolve(null);
                }
              },
              onerror: () => {
                log("Failed to fetch MAL character data");
                resolve(null);
              },
            });
          }),
        {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          failureTtl: 60 * 60 * 1000, // 1 hour for failures
          apiKey: "mal-character",
        },
      );

      return response?.data?.[0] || null;
    } catch (error) {
      log("Failed to search MAL character", error);
      return null;
    }
  }

  /**
   * Main method to fetch character metadata with fallback strategy
   */
  async fetchCharacterMetadata(characterName: string): Promise<{
    source: "anilist" | "mal";
    data: AniListCharacterData | MalCharacterData;
  } | null> {
    log("Fetching character metadata for:", characterName);

    // Step 1: Try AniList with original name
    let anilistData = await this.searchAniListCharacter(characterName);
    if (anilistData) {
      log("Found character on AniList:", anilistData.name.native || anilistData.name.alternative?.[0] || "Unknown");
      return { source: "anilist", data: anilistData };
    }

    // Step 2: Try MAL/Jikan
    const malData = await this.searchMalCharacter(characterName);
    if (!malData) {
      log("No character found on either AniList or MAL for:", characterName);
      return null;
    }

    log("Found character on MAL:", malData.name);

    // Step 3: If MAL has kanji, try AniList again with kanji
    if (malData.name_kanji) {
      log("Trying AniList again with kanji:", malData.name_kanji);
      anilistData = await this.searchAniListCharacterByKanji(malData.name_kanji, characterName);
      if (anilistData) {
        log(
          "Found character on AniList using kanji:",
          anilistData.name.native || anilistData.name.alternative?.[0] || "Unknown",
        );
        return { source: "anilist", data: anilistData };
      }
    }

    // Step 4: Fallback to MAL data
    log("Using MAL data as fallback for:", characterName);
    return { source: "mal", data: malData };
  }

  /**
   * Search AniList by kanji name but cache result under the original romanized name
   */
  private async searchAniListCharacterByKanji(
    kanjiName: string,
    originalRomanizedName: string,
  ): Promise<AniListCharacterData | null> {
    const originalCacheKey = `anilist-character-${originalRomanizedName}`;

    try {
      const response = await new Promise<{ data: { Character: AniListCharacterData } } | null>((resolve) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: CharacterService.ANILIST_GRAPHQL_URL,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          data: JSON.stringify({
            query: ANILIST_CHARACTER_QUERY,
            variables: { search: kanjiName },
          }),
          onload: (response) => {
            if (response.status === 200) {
              try {
                const data = JSON.parse(response.responseText);
                if (data.errors || !data.data?.Character) {
                  log("AniList Character search returned no results for kanji:", kanjiName);
                  resolve(null);
                } else {
                  resolve(data);
                }
              } catch (error) {
                log("Failed to parse AniList character response", error);
                resolve(null);
              }
            } else {
              log("AniList Character API returned status", response.status);
              resolve(null);
            }
          },
          onerror: () => {
            log("Failed to fetch AniList character data");
            resolve(null);
          },
        });
      });

      const characterData = response?.data?.Character || null;

      // If successful, cache the result under the original romanized name for future lookups
      if (characterData) {
        log("Caching AniList character data under original romanized key:", originalRomanizedName);
        // Use the cache utility to store the successful result under the original romanized name
        const cacheData = { data: { Character: characterData } };
        // Store in cache manually using GM_setValue with the same format as cachedApiCall
        GM_setValue(
          `ab-suite-cache-${originalCacheKey}`,
          JSON.stringify({
            data: cacheData,
            timestamp: Date.now(),
            ttl: 24 * 60 * 60 * 1000, // 24 hours
            apiKey: "anilist-character",
          }),
        );
      }

      return characterData;
    } catch (error) {
      log("Failed to search AniList character by kanji", error);
      return null;
    }
  }

  /**
   * Convert MAL data to AniList-like format for consistent rendering
   */
  normalizeMalData(malData: MalCharacterData): AniListCharacterData {
    return {
      image: {
        large: malData.images.webp.image_url || malData.images.jpg.image_url,
      },
      name: {
        native: malData.name_kanji,
        alternative: malData.name ? [malData.name] : null,
      },
      description: malData.about,
      age: null,
      bloodType: null,
      dateOfBirth: null,
      gender: null,
    };
  }
}

export const characterService = new CharacterService();
