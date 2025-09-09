import { Verse, SearchResult, SearchFilters, MatchBounds } from '../types/verse';
import { FilterUtils } from './filter-utils';
import { SearchUtils } from './search-utils';
import { RegexUtils } from '../shared/regex-utils';

export class VerseSearcher {
  constructor(private verses: Verse[], private wordIndex?: Map<string, Verse[]>) {}

  findVersesForTerms(
    terms: string[],
    filters: SearchFilters = {}
  ): Map<string, Verse[]> {
    const termToVerses = new Map<string, Verse[]>();

    for (const term of terms) {
      const matchingVerses = this.verses.filter((verse) => {
        if (!FilterUtils.shouldIncludeVerse(verse, filters)) return false;
        return RegexUtils.testMatch(verse.text, term);
      });
      termToVerses.set(term, matchingVerses);
    }

    return termToVerses;
  }

  searchVerses(terms: string[], filters: SearchFilters = {}): SearchResult[] {
    // Use optimized search with word index if available
    if (this.wordIndex) {
      return this.searchVersesOptimized(terms, filters);
    }

    // Fallback to original method
    return this.searchVersesFallback(terms, filters);
  }

  private searchVersesOptimized(terms: string[], filters: SearchFilters = {}): SearchResult[] {
    const results: SearchResult[] = [];
    const processedVerses = new Set<number>();

    // Collect candidate verses from word index
    const candidateVerses = new Map<Verse, Set<string>>();

    for (const term of terms) {
      const normalizedTerm = term.toLowerCase();
      const indexedVerses = this.wordIndex!.get(normalizedTerm) || [];

      for (const verse of indexedVerses) {
        if (!FilterUtils.shouldIncludeVerse(verse, filters)) continue;

        if (!candidateVerses.has(verse)) {
          candidateVerses.set(verse, new Set());
        }
        candidateVerses.get(verse)!.add(term);
      }
    }

    // Process candidate verses to find matches
    for (const [verse, matchedTerms] of candidateVerses) {
      const matches: MatchBounds[] = [];

      // Only check terms that were found in the index for this verse
      for (const term of matchedTerms) {
        const termMatches = RegexUtils.findMatches(verse.text, term);

        for (const match of termMatches) {
          matches.push({
            term,
            start: match.start,
            end: match.end,
          });
        }
      }

      if (matches.length > 0 && !processedVerses.has(verse.position)) {
        results.push({ verse, matches });
        processedVerses.add(verse.position);
      }
    }

    return results;
  }

  private searchVersesFallback(terms: string[], filters: SearchFilters = {}): SearchResult[] {
    const results: SearchResult[] = [];
    const processedVerses = new Set<number>();

    for (const verse of this.verses) {
      if (!FilterUtils.shouldIncludeVerse(verse, filters)) continue;

      const matches: MatchBounds[] = [];

      for (const term of terms) {
        const termMatches = RegexUtils.findMatches(verse.text, term);

        for (const match of termMatches) {
          matches.push({
            term,
            start: match.start,
            end: match.end,
          });
        }
      }

      if (matches.length > 0 && !processedVerses.has(verse.position)) {
        results.push({ verse, matches });
        processedVerses.add(verse.position);
      }
    }

    return results;
  }
}