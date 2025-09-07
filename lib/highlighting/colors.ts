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

/**
 * Unified color assignment function that ensures consistent highlighting
 * between search input and search results
 */
export function createUnifiedTermColorMaps(
  terms: string[],
  isDarkMode: boolean,
  isPairingsInput: boolean = false
) {
  const mainColors = getHighlightColors(isDarkMode);
  const pairingsColors = getPairingsHighlightColors(isDarkMode);

  const termToColor = new Map<string, string>();

  // Process terms in input order (same as search input)
  const processedTerms = terms.map(term => term.toLowerCase().trim());

  processedTerms.forEach((term, index) => {
    if (term) {
      let colorClass: string;
      let borderClass: string;

      if (isPairingsInput) {
        // Pairings input uses outline colors
        colorClass = pairingsColors[index % pairingsColors.length];
        borderClass = 'border';
      } else {
        // Regular search alternates between outline and filled styles
        const useFilledStyle = index >= pairingsColors.length;
        if (useFilledStyle) {
          // Use main colors for filled styles
          const filledIndex = index - pairingsColors.length;
          colorClass = mainColors[filledIndex % mainColors.length];
          borderClass = '';
        } else {
          // Use pairings colors for outline styles
          colorClass = pairingsColors[index % pairingsColors.length];
          borderClass = 'border';
        }
      }

      const finalColor = `${colorClass} ${borderClass}`.trim();
      termToColor.set(term, finalColor);
    }
  });

  return termToColor;
}

export function createTermColorMaps(
  mainTerms: string[],
  pairingsTerms: string[],
  isDarkMode: boolean,
  maintainInputOrder: boolean = false
) {
  const mainColors = getHighlightColors(isDarkMode);
  const pairingsColors = getPairingsHighlightColors(isDarkMode);

  // Combine all terms into a single array to assign colors sequentially
  const allTerms = [...mainTerms, ...pairingsTerms];

  let processedAllTerms: string[];
  if (maintainInputOrder) {
    // Maintain input order for consistency with search input
    processedAllTerms = allTerms.map(term => term.toLowerCase().trim());
  } else {
    // Use alphabetical order (legacy behavior)
    processedAllTerms = [...new Set(allTerms.map(term => term.toLowerCase().trim()))];
  }

  const mainTermToColor = new Map<string, string>();
  const pairingsTermToColor = new Map<string, string>();

  // Create combined color array: filled styles first, then outline styles
  const combinedColors = [...mainColors, ...pairingsColors];

  processedAllTerms.forEach((term, index) => {
    if (term) {
      const color = combinedColors[index % combinedColors.length];

      // Check if this term is in main terms or pairings terms
      const originalMainTerm = mainTerms.find(t => t.toLowerCase().trim() === term);
      const originalPairingsTerm = pairingsTerms.find(t => t.toLowerCase().trim() === term);

      if (originalMainTerm) {
        mainTermToColor.set(term, color);
      }
      if (originalPairingsTerm) {
        pairingsTermToColor.set(term, color);
      }
    }
  });

  return { mainTermToColor, pairingsTermToColor };
}