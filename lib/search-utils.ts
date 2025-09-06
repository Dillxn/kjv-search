/**
 * Centralized search utilities to avoid duplication across components
 */

import { RegexUtils } from './shared/regex-utils';

export class SearchTermProcessor {
  /**
   * Splits and normalizes search terms from a string (uses shared RegexUtils)
   */
  static processSearchString(searchString: string): string[] {
    return RegexUtils.processSearchString(searchString);
  }

  /**
   * Validates if search terms are ready for searching (uses shared RegexUtils)
   */
  static areTermsValid(searchString: string): boolean {
    return RegexUtils.areTermsValid(searchString);
  }

  /**
   * Gets minimum character requirement message
   */
  static getValidationMessage(searchString: string): string {
    if (searchString.trim().length < 2) {
      return 'Enter at least 2 characters to search';
    }
    return 'No results found';
  }

  /**
   * Processes both main and pairings search terms
   */
  static processBothSearchStrings(mainTerms: string, pairingsTerms: string) {
    return {
      mainTerms: this.processSearchString(mainTerms),
      pairingsTerms: this.processSearchString(pairingsTerms),
      hasValidMain: this.areTermsValid(mainTerms),
      hasValidPairings: this.areTermsValid(pairingsTerms),
    };
  }
}

export class SearchStateValidator {
  /**
   * Checks if search state is ready for performing search
   */
  static canPerformSearch(searchTerms: string, minLength: number = 2): boolean {
    return searchTerms.trim().length >= minLength;
  }

  /**
   * Checks if pairings search can be performed
   */
  static canPerformPairingsSearch(mainTerms: string, pairingsTerms: string): boolean {
    return this.canPerformSearch(mainTerms) && this.canPerformSearch(pairingsTerms);
  }
}

export class SearchResultsHelper {
  /**
   * Gets appropriate empty state message based on search state
   */
  static getEmptyStateMessage(searchTerms: string, resultType: 'results' | 'pairings'): string {
    if (searchTerms.trim().length < 2) {
      return 'Enter at least 2 characters to search';
    }
    return resultType === 'results' ? 'No results found' : 'No pairings found';
  }

  /**
   * Checks if results should be displayed
   */
  static shouldShowResults(searchTerms: string, results: unknown[]): boolean {
    return SearchStateValidator.canPerformSearch(searchTerms) && results.length > 0;
  }

  /**
   * Processes search string using shared utilities (DRY)
   */
  static processSearchString(searchString: string): string[] {
    return RegexUtils.processSearchString(searchString);
  }
}