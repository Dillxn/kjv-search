import {
  HIGHLIGHT_COLORS_LIGHT,
  HIGHLIGHT_COLORS_DARK,
  PAIRINGS_HIGHLIGHT_COLORS_LIGHT,
  PAIRINGS_HIGHLIGHT_COLORS_DARK,
} from '../constants';

export function getHighlightColors(isDarkMode: boolean): string[] {
  return isDarkMode ? HIGHLIGHT_COLORS_DARK : HIGHLIGHT_COLORS_LIGHT;
}

export function getPairingsHighlightColors(isDarkMode: boolean): string[] {
  return isDarkMode
    ? PAIRINGS_HIGHLIGHT_COLORS_DARK
    : PAIRINGS_HIGHLIGHT_COLORS_LIGHT;
}

// Create a consistent color assignment based on term content rather than array position
function getColorForTerm(term: string, colors: string[]): string {
  // Use a simple hash of the term to get consistent colors
  let hash = 0;
  for (let i = 0; i < term.length; i++) {
    hash = ((hash << 5) - hash) + term.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return colors[Math.abs(hash) % colors.length];
}

export function createTermColorMaps(
  mainTerms: string[],
  pairingsTerms: string[],
  isDarkMode: boolean
) {
  const mainColors = getHighlightColors(isDarkMode);
  const pairingsColors = getPairingsHighlightColors(isDarkMode);

  const mainTermToColor = new Map<string, string>();
  const processedMainTerms = [...new Set(mainTerms.map(term => term.toLowerCase().trim()))];
  processedMainTerms.forEach((term) => {
    if (term) {
      mainTermToColor.set(
        term,
        getColorForTerm(term, mainColors)
      );
    }
  });

  const pairingsTermToColor = new Map<string, string>();
  const processedPairingsTerms = [...new Set(pairingsTerms.map(term => term.toLowerCase().trim()))];
  processedPairingsTerms.forEach((term) => {
    if (term) {
      pairingsTermToColor.set(
        term,
        getColorForTerm(term, pairingsColors)
      );
    }
  });

  return { mainTermToColor, pairingsTermToColor };
}