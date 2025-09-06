import { MatchBounds } from './kjv-parser';
import {
  HIGHLIGHT_COLORS_LIGHT,
  HIGHLIGHT_COLORS_DARK,
  PAIRINGS_HIGHLIGHT_COLORS_LIGHT,
  PAIRINGS_HIGHLIGHT_COLORS_DARK,
} from './constants';

export function getHighlightColors(isDarkMode: boolean) {
  return isDarkMode ? HIGHLIGHT_COLORS_DARK : HIGHLIGHT_COLORS_LIGHT;
}

export function getPairingsHighlightColors(isDarkMode: boolean) {
  return isDarkMode
    ? PAIRINGS_HIGHLIGHT_COLORS_DARK
    : PAIRINGS_HIGHLIGHT_COLORS_LIGHT;
}

export function formatTextWithColors(text: string, isDarkMode: boolean): string {
  if (!text.trim()) {
    return '';
  }

  const colors = getHighlightColors(isDarkMode);
  // Split by spaces but preserve the spaces
  const parts = text.split(/(\s+)/);
  let wordIndex = 0;

  return parts
    .map((part) => {
      if (/^\s+$/.test(part)) {
        // This is whitespace, return as-is
        return part;
      } else if (part.trim()) {
        // This is a word, wrap it in a colored span
        const colorClass = colors[wordIndex % colors.length];
        wordIndex++;
        return `<span class="${colorClass} px-0.5 rounded">${part}</span>`;
      }
      return part;
    })
    .join('');
}

export function formatPairingsTextWithColors(text: string, isDarkMode: boolean): string {
  if (!text.trim()) {
    return '';
  }

  const colors = getPairingsHighlightColors(isDarkMode);
  // Split by spaces but preserve the spaces
  const parts = text.split(/(\s+)/);
  let wordIndex = 0;

  return parts
    .map((part) => {
      if (/^\s+$/.test(part)) {
        // This is whitespace, return as-is
        return part;
      } else if (part.trim()) {
        // This is a word, wrap it in a colored span
        const colorClass = colors[wordIndex % colors.length];
        wordIndex++;
        return `<span class="${colorClass} border px-0.5 rounded">${part}</span>`;
      }
      return part;
    })
    .join('');
}

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

export function highlightTextWithRegex(
  text: string,
  mainTerms: string[],
  pairingsTerms: string[],
  isDarkMode: boolean
): string {
  const mainColors = getHighlightColors(isDarkMode);
  const pairingsColors = getPairingsHighlightColors(isDarkMode);

  // Create maps of terms to colors
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

  let result = text;

  // First highlight pairings terms (they get borders)
  for (const [term, colorClass] of pairingsTermToColor.entries()) {
    if (term.length >= 2) {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTerm}\\w*`, 'gi');
      result = result.replace(
        regex,
        `<mark class="${colorClass} border px-0.5 rounded">$&</mark>`
      );
    }
  }

  // Then highlight main terms (no borders)
  for (const [term, colorClass] of mainTermToColor.entries()) {
    if (term.length >= 2) {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTerm}\\w*`, 'gi');
      result = result.replace(
        regex,
        `<mark class="${colorClass} px-0.5 rounded">$&</mark>`
      );
    }
  }

  return result;
}