/**
 * Fuzzy string matching utilities for matching character and seiyuu names
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculate similarity ratio between two strings (0-1, where 1 is exact match)
 */
function similarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(a, b);
  return (maxLength - distance) / maxLength;
}

/**
 * Normalize a name for comparison by removing common variations
 */
function normalizeName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      // Remove common suffixes/prefixes
      .replace(/\s+(san|kun|chan|sama)$/i, "")
      // Normalize spaces
      .replace(/\s+/g, " ")
      // Remove special characters
      .replace(/[^\w\s]/g, "")
  );
}

/**
 * Calculate match score between two names using multiple strategies
 */
export function fuzzyMatchName(name1: string, name2: string): number {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Exact match after normalization
  if (norm1 === norm2) {
    return 1.0;
  }

  // Calculate similarity
  const directSimilarity = similarity(norm1, norm2);

  // Check name parts (first/last name matching)
  const parts1 = norm1.split(/\s+/);
  const parts2 = norm2.split(/\s+/);

  let partMatchScore = 0;
  if (parts1.length > 1 && parts2.length > 1) {
    // Calculate best matching score for each part
    let totalPartScore = 0;
    let matchedParts = 0;

    for (const part1 of parts1) {
      if (part1.length <= 1) continue; // Skip single characters

      let bestPartScore = 0;
      for (const part2 of parts2) {
        if (part2.length <= 1) continue;

        // Exact match gets full score
        if (part1 === part2) {
          bestPartScore = 1.0;
          break;
        }

        // Fuzzy match for similar names (e.g., "souichirou" vs "soichiro")
        const partSimilarity = similarity(part1, part2);
        if (partSimilarity > 0.6) {
          // Only count reasonably similar parts
          bestPartScore = Math.max(bestPartScore, partSimilarity);
        }
      }

      if (bestPartScore > 0) {
        totalPartScore += bestPartScore;
        matchedParts++;
      }
    }

    // Average score of matched parts, penalized by unmatched parts
    if (matchedParts > 0) {
      const avgPartScore = totalPartScore / matchedParts;
      const coverageRatio = matchedParts / Math.max(parts1.length, parts2.length);
      partMatchScore = avgPartScore * coverageRatio;
    }
  }

  // Special case: single character names like "L" should ONLY match if:
  // 1. The longer name starts with that character AND
  // 2. The longer name is actually a full name (has space after the initial)
  let singleCharBonus = 0;
  if (norm1.length === 1 && norm2.startsWith(`${norm1} `)) {
    // "L" matches "L Lawliet" but not "Light"
    singleCharBonus = 0.9;
  } else if (norm2.length === 1 && norm1.startsWith(`${norm2} `)) {
    // "L Lawliet" matches "L"
    singleCharBonus = 0.9;
  }

  // Check if one name is contained in the other - but be more strict
  let containmentBonus = 0;
  if (norm1.length <= 4 && norm2.includes(` ${norm1} `)) {
    // Short name is a complete word within longer name
    containmentBonus = 0.7;
  } else if (norm2.length <= 4 && norm1.includes(` ${norm2} `)) {
    containmentBonus = 0.7;
  }

  // Final scoring - take the best of all strategies
  let finalScore = directSimilarity;

  if (singleCharBonus > finalScore) {
    finalScore = singleCharBonus;
  }

  if (containmentBonus > finalScore) {
    finalScore = containmentBonus;
  }

  if (partMatchScore > finalScore) {
    finalScore = partMatchScore;
  }

  return finalScore;
}

/**
 * Find all potential matches for a target name from a list of candidates
 * Returns array sorted by score (highest first)
 */
export function findAllMatches(
  targetName: string,
  candidates: Array<{ name: string; link: string }>,
  minScore = 0.3, // Only return matches above this threshold
): Array<{ candidate: { name: string; link: string }; score: number }> {
  if (candidates.length === 0) {
    return [];
  }

  const matches = candidates
    .map((candidate) => ({
      candidate,
      score: fuzzyMatchName(targetName, candidate.name),
    }))
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Find the best match for a target name from a list of candidates
 * @deprecated Use findAllMatches instead for better control
 */
export function findBestMatch(
  targetName: string,
  candidates: Array<{ name: string; link: string }>,
): { match: { name: string; link: string } | null; score: number } {
  const allMatches = findAllMatches(targetName, candidates);

  if (allMatches.length === 0) {
    return { match: null, score: 0 };
  }

  return { match: allMatches[0].candidate, score: allMatches[0].score };
}
