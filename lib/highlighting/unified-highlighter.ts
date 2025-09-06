import { MatchBounds } from './types';
import { RegexUtils } from '../shared/regex-utils';
import { createTermColorMaps } from './colors';

/**
 * Unified highlighting utility that consolidates bounds-based and regex-based highlighting
 * to eliminate DRY violations and ensure consistent behavior
 */
export class UnifiedHighlighter {
  /**
   * Highlights text using match bounds (preferred when available)
   */
  static highlightWithBounds(
    text: string,
    matches: MatchBounds[],
    isDarkMode: boolean,
    usePairingsColors: boolean = false
  ): string {
    if (!matches.length) return text;

    // Extract unique terms and create color maps
    const uniqueTerms = [...new Set(matches.map(m => m.term.toLowerCase().trim()))];
    const { mainTermToColor, pairingsTermToColor } = createTermColorMaps(
      usePairingsColors ? [] : uniqueTerms,
      usePairingsColors ? uniqueTerms : [],
      isDarkMode
    );

    const termToColor = usePairingsColors ? pairingsTermToColor : mainTermToColor;

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

  /**
   * Highlights text using regex matching (fallback when bounds not available)
   */
  static highlightWithRegex(
    text: string,
    mainTerms: string[],
    pairingsTerms: string[],
    isDarkMode: boolean
  ): string {
    if (!text || (!mainTerms.length && !pairingsTerms.length)) {
      return text;
    }

    // Use shared regex utilities for consistent term processing
    const validMainTerms = RegexUtils.normalizeSearchTerms(mainTerms);
    const validPairingsTerms = RegexUtils.normalizeSearchTerms(pairingsTerms);

    if (!validMainTerms.length && !validPairingsTerms.length) {
      return text;
    }

    const { mainTermToColor, pairingsTermToColor } = createTermColorMaps(
      validMainTerms,
      validPairingsTerms,
      isDarkMode
    );

    let result = text;

    // First highlight pairings terms (they get borders)
    for (const [term, colorClass] of pairingsTermToColor.entries()) {
      result = UnifiedHighlighter.highlightTermWithRegex(result, term, colorClass, true);
    }

    // Then highlight main terms (no borders)
    for (const [term, colorClass] of mainTermToColor.entries()) {
      result = UnifiedHighlighter.highlightTermWithRegex(result, term, colorClass, false);
    }

    return result;
  }

  /**
   * Highlights a single term using regex
   */
  private static highlightTermWithRegex(
    text: string,
    term: string,
    colorClass: string,
    hasBorder: boolean = false
  ): string {
    if (!RegexUtils.isValidSearchTerm(term)) {
      return text;
    }
    
    const regex = RegexUtils.createWordBoundaryRegex(term);
    const borderClass = hasBorder ? 'border' : '';
    
    return text.replace(
      regex,
      (match) => `<mark class="${colorClass} ${borderClass} px-0.5 rounded">${match}</mark>`
    );
  }

  /**
   * Auto-detects the best highlighting method based on available data
   */
  static highlightText(
    text: string,
    options: {
      matches?: MatchBounds[];
      mainTerms?: string[];
      pairingsTerms?: string[];
      isDarkMode: boolean;
      usePairingsColors?: boolean;
    }
  ): string {
    const { matches, mainTerms = [], pairingsTerms = [], isDarkMode, usePairingsColors = false } = options;

    // Prefer bounds-based highlighting when available
    if (matches && matches.length > 0) {
      return UnifiedHighlighter.highlightWithBounds(text, matches, isDarkMode, usePairingsColors);
    }

    // Fall back to regex-based highlighting
    return UnifiedHighlighter.highlightWithRegex(text, mainTerms, pairingsTerms, isDarkMode);
  }
}