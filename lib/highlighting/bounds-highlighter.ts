import { MatchBounds } from './types';
import { getHighlightColors, getPairingsHighlightColors } from './colors';

export function highlightText(
  text: string,
  matches: MatchBounds[],
  isDarkMode: boolean,
  usePairingsColors: boolean = false
): string {
  const colors = usePairingsColors
    ? getPairingsHighlightColors(isDarkMode)
    : getHighlightColors(isDarkMode);

  // Create a map of search terms to colors
  const termToColor = new Map<string, string>();
  const uniqueTerms = [
    ...new Set(matches.map((m) => m.term.toLowerCase().trim())),
  ];
  uniqueTerms.forEach((term, index) => {
    if (term) {
      termToColor.set(term, colors[index % colors.length]);
    }
  });

  // Sort matches by start position (reverse order to avoid index shifting)
  const sortedMatches = matches.slice().sort((a, b) => b.start - a.start);

  let result = text;

  // Apply highlights using the provided bounds
  for (const match of sortedMatches) {
    const term = match.term.toLowerCase().trim();
    const colorClass = termToColor.get(term);
    if (colorClass) {
      const before = result.slice(0, match.start);
      const matchedText = result.slice(match.start, match.end);
      const after = result.slice(match.end);
      const borderClass = usePairingsColors ? 'border' : '';
      result = `${before}<mark class="${colorClass} ${borderClass} px-0.5 rounded">${matchedText}</mark>${after}`;
    }
  }

  return result;
}