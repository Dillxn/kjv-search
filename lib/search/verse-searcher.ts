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
        return verse.text.toLowerCase().includes(term.toLowerCase());
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
      const verseText = verse.text.toLowerCase();

      for (const term of terms) {
        const termLower = term.toLowerCase();
        let startIndex = 0;

        while (true) {
          const index = verseText.indexOf(termLower, startIndex);
          if (index === -1) break;

          matches.push({
            term,
            start: index,
            end: index + termLower.length,
          });

          startIndex = index + 1;
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