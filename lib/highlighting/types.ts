export interface MatchBounds {
  start: number;
  end: number;
  term: string;
}

export interface HighlightConfig {
  isDarkMode: boolean;
  usePairingsColors?: boolean;
}

export interface TermColorMap {
  mainTerms: Map<string, string>;
  pairingsTerms: Map<string, string>;
}