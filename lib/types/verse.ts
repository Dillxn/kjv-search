export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
  position: number; // Position in the original text for canonical ordering
}

export interface MatchBounds {
  term: string;
  start: number;
  end: number;
}

export interface SearchResult {
  verse: Verse;
  matches: MatchBounds[];
}

export interface VersePairing {
  verses: Verse[];
  term1: string;
  term2: string;
  proximity: number; // 0 for same verse, otherwise verse distance
  isBetweenGroups?: boolean; // true if pairing is between two different search groups
  allTermPairs?: string[]; // All term combinations when consolidated
}

export interface SearchFilters {
  testament?: 'old' | 'new';
  books?: string[];
}