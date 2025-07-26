import { findAllMatches } from "@/lib/utils/fuzzyMatch";
import type { AniListMediaData } from "@/services/anilist";
import { aniListService } from "@/services/anilist";
import type { CharacterWithLinks, OriginalCharacterEntry } from "./types";

/**
 * Parse the original character table HTML to extract character and seiyuu links
 */
export function parseOriginalCharacterTable(html: string): OriginalCharacterEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("tr");
  const entries: OriginalCharacterEntry[] = [];

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 4) {
      const characterCell = cells[0];
      const seiyuuCell = cells[2];

      const characterLink = characterCell.querySelector("a");
      const seiyuuLink = seiyuuCell.querySelector("a");

      if (characterLink && seiyuuLink) {
        entries.push({
          characterName: characterLink.textContent?.trim() || "",
          characterLink: characterLink.getAttribute("href") || "",
          seiyuuName: seiyuuLink.textContent?.trim() || "",
          seiyuuLink: seiyuuLink.getAttribute("href") || "",
        });
      }
    }
  }

  return entries;
}

/**
 * Find the best character match using main name and all alternative names
 */
function findBestCharacterMatch(
  character: { name: string; alternativeNames: string[] },
  candidates: Array<{ name: string; link: string }>,
): { match: { name: string; link: string } | null; score: number } {
  // Try main name first
  const mainNameMatches = findAllMatches(character.name, candidates, 0.3);

  // Try all alternative names
  const alternativeMatches = character.alternativeNames.flatMap((altName) => findAllMatches(altName, candidates, 0.3));

  // Combine all matches and find the best one
  const allMatches = [...mainNameMatches, ...alternativeMatches];

  if (allMatches.length === 0) {
    return { match: null, score: 0 };
  }

  // Sort by score and return the best match
  allMatches.sort((a, b) => b.score - a.score);
  return { match: allMatches[0].candidate, score: allMatches[0].score };
}

/**
 * Process AniList data and original content to create characters with links
 */
export function processCharacterData(aniListData: AniListMediaData, originalContent?: string): CharacterWithLinks[] {
  // Get main characters from AniList data
  const characters = aniListService.getMainCharacters(aniListData.characters);

  // Parse original character table to extract links
  const originalEntries = originalContent ? parseOriginalCharacterTable(originalContent) : [];

  // Create lookup arrays for matching
  const characterCandidates = originalEntries.map((entry) => ({
    name: entry.characterName,
    link: entry.characterLink,
  }));

  const seiyuuCandidates = originalEntries.map((entry) => ({
    name: entry.seiyuuName,
    link: entry.seiyuuLink,
  }));

  // Step 1: Find all potential character matches (including alternative names)
  const characterMatches = characters.map((character, index) => {
    const match = findBestCharacterMatch(character, characterCandidates);

    return {
      characterIndex: index,
      match: match.match,
      score: match.score,
    };
  });

  // Step 2: Find all potential voice actor matches (separate from characters)
  const voiceActorMatches = characters.map((character, index) => {
    if (!character.voiceActor) {
      return { characterIndex: index, match: null, score: 0 };
    }

    const matches = findAllMatches(character.voiceActor.name, seiyuuCandidates, 0.3);
    const bestMatch = matches.length > 0 ? matches[0] : null;

    return {
      characterIndex: index,
      match: bestMatch?.candidate || null,
      score: bestMatch?.score || 0,
    };
  });

  // Step 3: Resolve conflicts for character links
  const characterLinkAssignments = new Map<string, number>(); // link -> character index

  // Sort character matches by score and assign greedily
  const sortedCharacterMatches = characterMatches
    .filter((m) => m.match && m.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  for (const match of sortedCharacterMatches) {
    if (!match.match) continue;
    const link = match.match.link;
    if (!characterLinkAssignments.has(link)) {
      characterLinkAssignments.set(link, match.characterIndex);
    }
  }

  // Step 4: Resolve conflicts for voice actor links
  const voiceActorLinkAssignments = new Map<string, number>(); // link -> character index

  // Sort voice actor matches by score and assign greedily (only high-scoring matches)
  const sortedVoiceActorMatches = voiceActorMatches
    .filter((m) => m.match && m.score >= 0.8) // Strict threshold for voice actors
    .sort((a, b) => b.score - a.score);

  for (const match of sortedVoiceActorMatches) {
    if (!match.match) continue;
    const link = match.match.link;
    if (!voiceActorLinkAssignments.has(link)) {
      voiceActorLinkAssignments.set(link, match.characterIndex);
    }
  }

  // Step 5: Build final character list with links
  const charactersWithLinks = characters.map((character, index) => {
    const characterLink = Array.from(characterLinkAssignments.entries()).find(
      ([_link, charIndex]) => charIndex === index,
    )?.[0];

    const voiceActorLink = Array.from(voiceActorLinkAssignments.entries()).find(
      ([_link, charIndex]) => charIndex === index,
    )?.[0];

    return {
      character,
      characterLink,
      voiceActorLink,
    };
  });

  return charactersWithLinks;
}
