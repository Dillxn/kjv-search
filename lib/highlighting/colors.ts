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

export function createTermColorMaps(
  mainTerms: string[],
  pairingsTerms: string[],
  isDarkMode: boolean
) {
  const mainColors = getHighlightColors(isDarkMode);
  const pairingsColors = getPairingsHighlightColors(isDarkMode);

  const mainTermToColor = new Map<string, string>();
  mainTerms.forEach((term, index) => {
    const normalizedTerm = term.toLowerCase().trim();
    if (normalizedTerm) {
      mainTermToColor.set(
        normalizedTerm,
        mainColors[index % mainColors.length]
      );
    }
  });

  const pairingsTermToColor = new Map<string, string>();
  pairingsTerms.forEach((term, index) => {
    const normalizedTerm = term.toLowerCase().trim();
    if (normalizedTerm) {
      pairingsTermToColor.set(
        normalizedTerm,
        pairingsColors[index % pairingsColors.length]
      );
    }
  });

  return { mainTermToColor, pairingsTermToColor };
}