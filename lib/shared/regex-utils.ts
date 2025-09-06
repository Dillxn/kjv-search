/**
 * Shared regex utilities used by both KJV parser and highlighting system
 * to ensure consistent word matching behavior
 */

export class RegexUtils {
  /**
   * Escapes special regex characters in a string
   */
  static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Creates a word boundary regex for matching terms
   * This matches words that start with the term (e.g., "faith" matches "faithful")
   */
  static createWordBoundaryRegex(term: string, flags: string = 'gi'): RegExp {
    const escapedTerm = RegexUtils.escapeRegex(term.toLowerCase().trim());
    return new RegExp(`\\b${escapedTerm}\\w*`, flags);
  }

  /**
   * Validates if a term is suitable for searching
   */
  static isValidSearchTerm(term: string): boolean {
    const normalized = term.toLowerCase().trim();
    return normalized.length >= 2;
  }

  /**
   * Normalizes and filters search terms
   */
  static normalizeSearchTerms(terms: string[]): string[] {
    return terms
      .map(term => term.trim().toLowerCase())
      .filter(RegexUtils.isValidSearchTerm);
  }

  /**
   * Splits a search string into individual terms
   */
  static splitSearchString(searchString: string): string[] {
    return searchString
      .split(/\s+/)
      .map(term => term.trim())
      .filter(term => term.length > 0);
  }

  /**
   * Finds all matches of a term in text with their positions
   */
  static findMatches(text: string, term: string): Array<{ match: string; start: number; end: number }> {
    const regex = RegexUtils.createWordBoundaryRegex(term);
    const matches: Array<{ match: string; start: number; end: number }> = [];
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        match: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return matches;
  }

  /**
   * Tests if a term matches in the given text
   */
  static testMatch(text: string, term: string): boolean {
    const regex = RegexUtils.createWordBoundaryRegex(term, 'i');
    return regex.test(text);
  }

  /**
   * Processes search string into normalized terms (DRY utility)
   */
  static processSearchString(searchString: string): string[] {
    return RegexUtils.normalizeSearchTerms(RegexUtils.splitSearchString(searchString));
  }

  /**
   * Validates if search terms are ready for searching (DRY utility)
   */
  static areTermsValid(searchString: string): boolean {
    const processed = RegexUtils.processSearchString(searchString);
    return processed.length > 0;
  }
}