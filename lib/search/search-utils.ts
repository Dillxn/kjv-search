import { RegexUtils } from '../shared/regex-utils';

export class SearchUtils {
  static normalizeWord(word: string): string {
    return word
      .toLowerCase()
      .replace(/[^\w]/g, '')
      .trim();
  }

  static areTermsSameWord(term1: string, term2: string): boolean {
    const normalized1 = this.normalizeWord(term1);
    const normalized2 = this.normalizeWord(term2);

    return (
      normalized1.includes(normalized2) || normalized2.includes(normalized1)
    );
  }

  static validateAndLimitTerms(terms: string[]): string[] {
    const validTerms = RegexUtils.normalizeSearchTerms(terms);
    
    // No artificial limits - return all valid terms
    return validTerms;
  }

  static getWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }
}