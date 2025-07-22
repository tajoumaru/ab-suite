import { findAllMatches } from "@/utils/fuzzyMatch";
import { log } from "@/utils/logging";
import type { SeriesEntry } from "./seriesPageService";

interface AniListRelation {
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
}

interface MatchedRelation {
  animeBytesEntry?: SeriesEntry;
  aniListRelation?: AniListRelation;
  relationType: string;
  title: string;
  type: string;
  year?: number;
  url?: string;
  coverImage?: string;
}

// Get all possible AnimeBytes types that an AniList entry could match
function getCompatibleTypes(aniListType: string, aniListFormat: string): string[] {
  if (aniListType === "ANIME") {
    switch (aniListFormat) {
      case "TV":
      case "TV_SHORT":
        return ["TV Series"];
      case "MOVIE":
        return ["Movie"];
      case "OVA":
        // OVAs can be OVA, TV Special, BD Special, or DVD Special
        return ["OVA", "TV Special", "BD Special", "DVD Special"];
      case "ONA":
        return ["ONA"];
      case "SPECIAL":
        return ["TV Special", "BD Special", "DVD Special"];
      case "MUSIC":
        return []; // No direct equivalent, skip
      default:
        return ["TV Series"]; // fallback
    }
  } else if (aniListType === "MANGA") {
    switch (aniListFormat) {
      case "NOVEL":
        return ["Light Novel"];
      case "MANGA":
        return ["Manga"];
      case "ONE_SHOT":
        return ["Manga", "Oneshot"];
      default:
        return ["Manga"];
    }
  }
  return [];
}

// Get a readable relation type
function getReadableRelationType(relationType: string, source?: string): string {
  // Special case: if it's an adaptation from an original source, it's actually the source
  if (relationType === "ADAPTATION" && source === "ORIGINAL") {
    return "Source";
  }

  const typeMap: Record<string, string> = {
    ADAPTATION: "Adaptation",
    PREQUEL: "Prequel",
    SEQUEL: "Sequel",
    PARENT: "Parent Story",
    SIDE_STORY: "Side Story",
    CHARACTER: "Character",
    SUMMARY: "Summary",
    ALTERNATIVE: "Alternative",
    SPIN_OFF: "Spin-off",
    OTHER: "Other",
    SOURCE: "Source",
    COMPILATION: "Compilation",
    CONTAINS: "Contains",
  };
  return typeMap[relationType] || relationType;
}

// Check if an AnimeBytes type is compatible with an AniList entry
function isTypeCompatible(aniListType: string, aniListFormat: string, animeBytesType: string): boolean {
  // Skip artbooks entirely
  if (animeBytesType === "Artbook") return false;

  const compatibleTypes = getCompatibleTypes(aniListType, aniListFormat);
  return compatibleTypes.includes(animeBytesType);
}

// Find the best match using fuzzy title matching, type matching, and year tolerance
function findBestMatch(
  aniListRelation: AniListRelation,
  animeBytesEntries: SeriesEntry[],
  minScore = 0.4, // Minimum score threshold
): { match: SeriesEntry | null; score: number } {
  // We don't need to normalize type anymore, we use compatibility checking
  const aniListYear = aniListRelation.node.startDate?.year;
  const aniListTitle = aniListRelation.node.title.english || aniListRelation.node.title.romaji || "";

  let bestMatch: SeriesEntry | null = null;
  let bestScore = 0;

  for (const entry of animeBytesEntries) {
    // First check: types must be compatible
    if (!isTypeCompatible(aniListRelation.node.type, aniListRelation.node.format, entry.type)) {
      continue; // Skip incompatible types entirely
    }

    let score = 0;

    // Title matching (most important if both titles are available)
    if (entry.title && aniListTitle) {
      const titleMatches = findAllMatches(aniListTitle, [{ name: entry.title, link: entry.url }], 0.4); // Lowered threshold slightly
      if (titleMatches.length > 0) {
        score += titleMatches[0].score * 0.8; // Increased weight for title match
      } else {
        // If we have titles but they don't match well, this is probably not the right match
        continue;
      }
    } else if (!entry.title && !aniListTitle) {
      // If neither has a title, we can still match on type and year
      score += 0.35; // Base score for type-only matching
    } else {
      // One has a title, the other doesn't - still give a reasonable base score
      score += 0.25;
    }

    // Type matching bonus
    const compatibleTypes = getCompatibleTypes(aniListRelation.node.type, aniListRelation.node.format);
    const exactMatch = compatibleTypes[0] === entry.type; // First in list is preferred
    if (exactMatch) {
      score += 0.15; // 15% bonus for preferred type match
    } else {
      score += 0.08; // 8% bonus for compatible but not preferred type
    }

    // Year matching with progressive penalties for larger differences
    if (aniListYear && entry.year) {
      const yearDiff = Math.abs(entry.year - aniListYear);
      if (yearDiff === 0) {
        score += 0.2; // 20% boost for exact year match
      } else if (yearDiff === 1) {
        score += 0.05; // Small boost for 1 year off
      } else if (yearDiff === 2) {
        score += 0.02; // Tiny boost for 2 years off
      } else if (yearDiff === 3) {
        // Neutral - no change to score
      } else if (yearDiff === 4) {
        score -= 0.1; // Start penalizing at 4 years
      } else if (yearDiff === 5) {
        score -= 0.2; // Moderate penalty
      } else if (yearDiff === 6) {
        score -= 0.3; // Strong penalty
      } else if (yearDiff >= 7) {
        score -= 0.4; // Heavy penalty for 7+ years difference
      }
    }

    // Track best match
    if (score > bestScore && score >= minScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return { match: bestMatch, score: bestScore };
}

export function matchRelations(
  animeBytesEntries: SeriesEntry[],
  aniListRelations: AniListRelation[],
  currentPageUrl: string,
): MatchedRelation[] {
  // Filter out the current page from AnimeBytes entries
  const otherEntries = animeBytesEntries.filter((entry) => !entry.url.includes(currentPageUrl.split("?")[1] || ""));

  // Filter out CHARACTER relations as they're unlikely to be on AnimeBytes
  const filteredRelations = aniListRelations.filter((relation) => relation.relationType !== "CHARACTER");

  // Step 1: Find all potential matches for each AniList relation
  const relationMatches = filteredRelations.map((relation, index) => {
    const match = findBestMatch(relation, otherEntries);
    return {
      relationIndex: index,
      relation,
      match: match.match,
      score: match.score,
    };
  });

  // Step 2: Filter out low-quality matches
  const goodMatches = relationMatches.filter((m) => m.match && m.score >= 0.4);

  // Step 3: Resolve conflicts - ensure each AnimeBytes entry is only matched once
  const urlAssignments = new Map<string, number>(); // url -> relation index
  const finalMatches: typeof relationMatches = [];

  // Sort by score (highest first) and assign greedily
  const sortedMatches = goodMatches.sort((a, b) => b.score - a.score);

  for (const match of sortedMatches) {
    if (!match.match) continue;
    const url = match.match.url;

    // Only assign if this URL hasn't been taken yet
    if (!urlAssignments.has(url)) {
      urlAssignments.set(url, match.relationIndex);
      finalMatches.push(match);
    }
  }

  // Step 4: Build final results
  const results: MatchedRelation[] = finalMatches.map((match) => {
    const relation = match.relation;
    const entry = match.match; // We know this is not null from filtering
    if (!entry) throw new Error("Internal error: match should not be null");
    const title = relation.node.title.english || relation.node.title.romaji || "Unknown";

    return {
      animeBytesEntry: entry,
      aniListRelation: relation,
      relationType: getReadableRelationType(relation.relationType, relation.node.source),
      title,
      type: getCompatibleTypes(relation.node.type, relation.node.format)[0] || relation.node.type,
      year: relation.node.startDate.year || undefined,
      url: entry.url,
      coverImage: relation.node.coverImage.extraLarge || undefined,
    };
  });

  // Step 5: Sort by relation type importance
  const typeOrder = [
    "Source",
    "Adaptation",
    "Prequel",
    "Sequel",
    "Parent Story",
    "Side Story",
    "Alternative",
    "Related",
  ];
  results.sort((a, b) => {
    const aIndex = typeOrder.indexOf(a.relationType);
    const bIndex = typeOrder.indexOf(b.relationType);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  log(`Found ${results.length} relations (${goodMatches.length - results.length} conflicts resolved)`);
  if (results.length === 0) {
    log("No relations matched. Summary:", {
      aniListRelations: filteredRelations.length,
      animeBytesEntries: otherEntries.length,
      characterRelationsFiltered: aniListRelations.length - filteredRelations.length,
    });
  }

  return results;
}
