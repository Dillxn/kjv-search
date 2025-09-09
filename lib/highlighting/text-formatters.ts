import { getHighlightColors, getPairingsHighlightColors, createUnifiedTermColorMaps } from './colors';
import { RegexUtils } from '../shared/regex-utils';

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

interface FormatOptions {
  extraClasses?: string;
  wrapperTag?: string;
}

function formatTextWithColorArray(
  text: string,
  colors: string[],
  options: FormatOptions = {},
  isDarkMode: boolean = false,
  isPairingsInput: boolean = false
): string {
  if (!text.trim()) return '';

  const { extraClasses = '', wrapperTag = 'mark' } = options;

  // Extract unique terms from the input text using the same processing as search results
  const terms = RegexUtils.processSearchString(text);
  const uniqueTerms = [...new Set(terms)];

  // Keep original order for alternating pattern (don't sort alphabetically)
  // This ensures the visual order matches the alternating pattern
  const sortedTerms = uniqueTerms;

  // Use unified color assignment for consistency with search results
  const termToColor = createUnifiedTermColorMaps(sortedTerms, isDarkMode, isPairingsInput);

  // Apply highlighting using regex
  let result = text;
  sortedTerms.forEach((term) => {
    if (RegexUtils.isValidSearchTerm(term)) {
      const normalizedTerm = term.toLowerCase().trim();
      const colorClasses = termToColor.get(normalizedTerm);

      if (colorClasses) {
        // Use exact word boundary match for input highlighting (not partial word matches)
        const escapedTerm = RegexUtils.escapeRegex(term.toLowerCase().trim());
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
        result = result.replace(
          regex,
          (match) => `<${wrapperTag} class="${colorClasses} px-0.5 rounded">${match}</${wrapperTag}>`
        );
      }
    }
  });

  return result;
}

export function formatTextWithColors(text: string, isDarkMode: boolean, isPairingsInput: boolean = false): string {
  const colors = getHighlightColors(isDarkMode);
  return formatTextWithColorArray(text, colors, {}, isDarkMode, isPairingsInput);
}

export function formatPairingsTextWithColors(text: string, isDarkMode: boolean): string {
  const colors = getPairingsHighlightColors(isDarkMode);
  return formatTextWithColorArray(text, colors, {}, isDarkMode, true);
}