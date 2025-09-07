import { getHighlightColors, getPairingsHighlightColors } from './colors';
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

  // Create consistent color mapping based on term content
  const mainColors = getHighlightColors(isDarkMode);
  const pairingsColors = getPairingsHighlightColors(isDarkMode);

  // Apply highlighting using regex with consistent colors
  let result = text;
  for (const term of uniqueTerms) {
    if (RegexUtils.isValidSearchTerm(term)) {
      const normalizedTerm = term.toLowerCase().trim();
      const colorClass = isPairingsInput
        ? getColorForTerm(normalizedTerm, pairingsColors)
        : getColorForTerm(normalizedTerm, mainColors);

      const regex = RegexUtils.createWordBoundaryRegex(term);
      const borderClass = isPairingsInput ? 'border' : '';
      result = result.replace(
        regex,
        (match) => `<${wrapperTag} class="${colorClass} ${borderClass} px-0.5 rounded">${match}</${wrapperTag}>`
      );
    }
  }

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