export interface OriginalCharacterEntry {
  characterName: string;
  characterLink: string;
  seiyuuName: string;
  seiyuuLink: string;
}

export interface Character {
  name: string;
  role: string;
  image: string | null;
  alternativeNames: string[];
  voiceActor: {
    name: string;
    image: string | null;
  } | null;
}

export interface CharacterMatch {
  characterIndex: number;
  match: { name: string; link: string } | null;
  score: number;
}

export interface CharacterWithLinks {
  character: Character;
  characterLink?: string;
  voiceActorLink?: string;
}

export interface CharacterCardProps {
  character: Character;
  characterLink?: string;
  voiceActorLink?: string;
}

export interface EnhancedCharacterCardsProps {
  characters: CharacterWithLinks[];
  originalContent?: string;
  showToggle?: boolean;
}
