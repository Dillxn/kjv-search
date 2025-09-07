import { MatchBounds } from './types';
import { RegexUtils } from '../shared/regex-utils';
import { createTermColorMaps, getHighlightColors, getPairingsHighlightColors, createUnifiedTermColorMaps } from './colors';

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
    usePairingsColors: boolean = false,
    mainTermsOrder?: string[],
    pairingsTermsOrder?: string[]
  ): string {
    if (!matches.length) return text;

    // Extract unique terms and create color maps
    const uniqueTerms = [...new Set(matches.map(m => m.term.toLowerCase().trim()))];

    // If maintaining input order, use the provided term order
    const mainTerms = mainTermsOrder ? mainTermsOrder : (usePairingsColors ? [] : uniqueTerms);
    const pairingsTerms = pairingsTermsOrder ? pairingsTermsOrder : (usePairingsColors ? uniqueTerms : []);

    let termToColor: Map<string, string>;

    if (mainTermsOrder || pairingsTermsOrder) {
      // Use unified color assignment for consistency with search input
      const allTerms = [...(mainTermsOrder || []), ...(pairingsTermsOrder || [])];
      termToColor = createUnifiedTermColorMaps(allTerms, isDarkMode, usePairingsColors);
    } else {
      // Use legacy color assignment
      const { mainTermToColor, pairingsTermToColor } = createTermColorMaps(
        mainTerms,
        pairingsTerms,
        isDarkMode,
        false
      );
      termToColor = usePairingsColors ? pairingsTermToColor : mainTermToColor;
    }

    // Sort matches by start position (reverse order to avoid index shifting)
    const sortedMatches = matches.slice().sort((a, b) => b.start - a.start);

    let result = text;

    // Apply highlights using the provided bounds
    for (const match of sortedMatches) {
      const term = match.term.toLowerCase().trim();
      const colorClasses = termToColor.get(term);
      if (colorClasses) {
        const before = result.slice(0, match.start);
        const matchedText = result.slice(match.start, match.end);
        const after = result.slice(match.end);
        result = `${before}<mark class="${colorClasses} px-0.5 rounded">${matchedText}</mark>${after}`;
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
    isDarkMode: boolean,
    maintainInputOrder: boolean = false
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

    let result = text;

    if (maintainInputOrder) {
      // Use unified color assignment for consistency with search input
      const allTerms = [...validMainTerms, ...validPairingsTerms];
      const termToColor = createUnifiedTermColorMaps(allTerms, isDarkMode, false);

      // Highlight all terms using unified color assignment
      for (const [term, colorClasses] of termToColor.entries()) {
        result = UnifiedHighlighter.highlightTermWithRegex(result, term, colorClasses, false);
      }
    } else {
      // Use legacy color assignment
      const { mainTermToColor, pairingsTermToColor } = createTermColorMaps(
        validMainTerms,
        validPairingsTerms,
        isDarkMode,
        false
      );

      // First highlight pairings terms (they get borders)
      for (const [term, colorClass] of pairingsTermToColor.entries()) {
        result = UnifiedHighlighter.highlightTermWithRegex(result, term, colorClass, true);
      }

      // Then highlight main terms (no borders)
      for (const [term, colorClass] of mainTermToColor.entries()) {
        result = UnifiedHighlighter.highlightTermWithRegex(result, term, colorClass, false);
      }
    }

    return result;
  }

  /**
   * Highlights a single term using regex
   */
  private static highlightTermWithRegex(
    text: string,
    term: string,
    colorClasses: string,
    hasBorder: boolean = false
  ): string {
    if (!RegexUtils.isValidSearchTerm(term)) {
      return text;
    }

    const regex = RegexUtils.createWordBoundaryRegex(term);

    // If colorClasses already includes border, don't add it again
    const finalClasses = hasBorder && !colorClasses.includes('border')
      ? `${colorClasses} border`
      : colorClasses;

    return text.replace(
      regex,
      (match) => `<mark class="${finalClasses} px-0.5 rounded">${match}</mark>`
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
      maintainInputOrder?: boolean;
    }
  ): string {
    const { matches, mainTerms = [], pairingsTerms = [], isDarkMode, usePairingsColors = false, maintainInputOrder = false } = options;

    // Prefer bounds-based highlighting when available
    if (matches && matches.length > 0) {
      return UnifiedHighlighter.highlightWithBounds(text, matches, isDarkMode, usePairingsColors, maintainInputOrder ? mainTerms : undefined, maintainInputOrder ? pairingsTerms : undefined);
    }

    // Fall back to regex-based highlighting
    return UnifiedHighlighter.highlightWithRegex(text, mainTerms, pairingsTerms, isDarkMode, maintainInputOrder);
  }

}