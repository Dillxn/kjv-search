import { Verse, SearchResult, SearchFilters, MatchBounds } from '../types/verse';
import { FilterUtils } from './filter-utils';
import { SearchUtils } from './search-utils';
import { RegexUtils } from '../shared/regex-utils';

export class VerseSearcher {
  constructor(private verses: Verse[]) {}

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