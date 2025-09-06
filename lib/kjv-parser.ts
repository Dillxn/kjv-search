export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
  position: number; // Position in the original text for canonical ordering
}

export interface MatchBounds {
  term: string;
  start: number;
  end: number;
}

export interface SearchResult {
  verse: Verse;
  matches: MatchBounds[];
}

export interface VersePairing {
  verses: Verse[];
  term1: string;
  term2: string;
  proximity: number; // 0 for same verse, otherwise verse distance
  isBetweenGroups?: boolean; // true if pairing is between two different search groups
}

export interface SearchFilters {
  testament?: 'old' | 'new';
  books?: string[];
}

import { RegexUtils } from './shared/regex-utils';
import { APP_CONFIG } from './constants';

// Testament definitions
export const OLD_TESTAMENT_BOOKS = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
];

export const NEW_TESTAMENT_BOOKS = [
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
];

// Use centralized configuration
const CONFIG = {
  MAX_TOTAL_PAIRINGS: APP_CONFIG.PAIRINGS.MAX_TOTAL_PAIRINGS,
  MAX_SEARCH_TERMS: APP_CONFIG.SEARCH.MAX_SEARCH_TERMS,
  MAX_SEARCH_TERMS_PER_GROUP: APP_CONFIG.SEARCH.MAX_SEARCH_TERMS_PER_GROUP,
  MAX_PAIRINGS_PER_TERM_PAIR: APP_CONFIG.PAIRINGS.MAX_PAIRINGS_PER_TERM_PAIR,
  MAX_PROXIMITY: APP_CONFIG.PAIRINGS.MAX_PROXIMITY,
  MIN_TERM_LENGTH: APP_CONFIG.SEARCH.MIN_TERM_LENGTH,
} as const;

// Utility functions
class SearchUtils {
  static normalizeWord(word: string): string {
    return word
      .toLowerCase()
      .trim()
      .replace(/(ful|ly|ing|ed|er|est|s)$/, '')
      .replace(/^faithf/, 'faith')
      .replace(/^lov/, 'love')
      .replace(/^runn/, 'run')
      .replace(/^begun$/, 'begin')
      .replace(/^began$/, 'begin');
  }

  static areTermsSameWord(term1: string, term2: string): boolean {
    const normalized1 = SearchUtils.normalizeWord(term1);
    const normalized2 = SearchUtils.normalizeWord(term2);

    if (normalized1 === normalized2) return true;

    return (
      normalized1.includes(normalized2) || normalized2.includes(normalized1)
    );
  }

  static validateAndLimitTerms(
    terms: string[],
    maxTerms: number = CONFIG.MAX_SEARCH_TERMS
  ): string[] {
    const validTerms = RegexUtils.normalizeSearchTerms(terms);
    const limitedTerms = validTerms.slice(0, maxTerms);

    if (terms.length > maxTerms) {
      console.warn(
        `Limited search terms from ${terms.length} to ${maxTerms} to prevent memory issues`
      );
    }

    return limitedTerms;
  }

  static getWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  // Use shared RegexUtils for consistent processing
  static processSearchString(searchString: string): string[] {
    return RegexUtils.processSearchString(searchString);
  }
}

class FilterUtils {
  static getBooksForTestament(testament?: 'old' | 'new'): string[] {
    if (testament === 'old') return OLD_TESTAMENT_BOOKS;
    if (testament === 'new') return NEW_TESTAMENT_BOOKS;
    return [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
  }

  static shouldIncludeVerse(verse: Verse, filters: SearchFilters): boolean {
    if (filters.testament) {
      const allowedBooks = FilterUtils.getBooksForTestament(filters.testament);
      if (!allowedBooks.includes(verse.book)) return false;
    }

    if (filters.books?.length && !filters.books.includes(verse.book)) {
      return false;
    }

    return true;
  }

  static filterVerses(verses: Verse[], filters: SearchFilters): Verse[] {
    return verses.filter((verse) =>
      FilterUtils.shouldIncludeVerse(verse, filters)
    );
  }
}

class VerseSearcher {
  constructor(private verses: Verse[]) {}

  findVersesForTerm(term: string, filters: SearchFilters = {}): Verse[] {
    const matchingVerses: Verse[] = [];

    for (const verse of this.verses) {
      if (!FilterUtils.shouldIncludeVerse(verse, filters)) continue;

      if (RegexUtils.testMatch(verse.text, term)) {
        matchingVerses.push(verse);
      }
    }

    return matchingVerses;
  }

  findVersesForTerms(
    terms: string[],
    filters: SearchFilters = {}
  ): Map<string, Verse[]> {
    const termToVerses = new Map<string, Verse[]>();

    for (const term of terms) {
      const verses = this.findVersesForTerm(term, filters);
      termToVerses.set(term, verses);
    }

    return termToVerses;
  }
}

class PairingGenerator {
  static findPairingsForTerms(
    term1: string,
    term2: string,
    verses1: Verse[],
    verses2: Verse[],
    isBetweenGroups: boolean = false
  ): VersePairing[] {
    const pairings: VersePairing[] = [];

    // Same verse pairings (proximity 0)
    pairings.push(
      ...PairingGenerator.findSameVersePairings(
        term1,
        term2,
        verses1,
        verses2,
        isBetweenGroups
      )
    );

    // Different verse pairings
    pairings.push(
      ...PairingGenerator.findDifferentVersePairings(
        term1,
        term2,
        verses1,
        verses2,
        isBetweenGroups
      )
    );

    return pairings.slice(0, CONFIG.MAX_PAIRINGS_PER_TERM_PAIR);
  }

  private static findSameVersePairings(
    term1: string,
    term2: string,
    verses1: Verse[],
    verses2: Verse[],
    isBetweenGroups: boolean
  ): VersePairing[] {
    const pairings: VersePairing[] = [];
    const verse2Positions = new Set(verses2.map((v) => v.position));

    for (const verse of verses1) {
      if (verse2Positions.has(verse.position)) {
        pairings.push({
          verses: [verse],
          term1,
          term2,
          proximity: 0,
          isBetweenGroups,
        });
      }
    }

    return pairings;
  }

  private static findDifferentVersePairings(
    term1: string,
    term2: string,
    verses1: Verse[],
    verses2: Verse[],
    isBetweenGroups: boolean
  ): VersePairing[] {
    const pairings: VersePairing[] = [];

    for (const verse1 of verses1) {
      if (pairings.length >= CONFIG.MAX_PAIRINGS_PER_TERM_PAIR) break;

      for (const verse2 of verses2) {
        if (pairings.length >= CONFIG.MAX_PAIRINGS_PER_TERM_PAIR) break;
        if (verse1.position === verse2.position) continue;

        const proximity = Math.abs(verse1.position - verse2.position);
        if (proximity > CONFIG.MAX_PROXIMITY) continue;

        pairings.push({
          verses:
            verse1.position < verse2.position
              ? [verse1, verse2]
              : [verse2, verse1],
          term1,
          term2,
          proximity,
          isBetweenGroups,
        });
      }
    }

    return pairings;
  }

  static generateAllPairings(
    termToVerses: Map<string, Verse[]>,
    isBetweenGroups: boolean = false
  ): VersePairing[] {
    const pairings: VersePairing[] = [];
    const processedPairings = new Set<string>();
    const termArray = Array.from(termToVerses.keys());

    for (let i = 0; i < termArray.length; i++) {
      for (let j = i + 1; j < termArray.length; j++) {
        if (pairings.length >= CONFIG.MAX_TOTAL_PAIRINGS) {
          console.warn(
            `Reached maximum pairing limit (${CONFIG.MAX_TOTAL_PAIRINGS}). Stopping to prevent memory issues.`
          );
          return pairings;
        }

        const term1 = termArray[i];
        const term2 = termArray[j];

        if (SearchUtils.areTermsSameWord(term1, term2)) continue;

        const verses1 = termToVerses.get(term1) || [];
        const verses2 = termToVerses.get(term2) || [];

        const termPairings = PairingGenerator.findPairingsForTerms(
          term1,
          term2,
          verses1,
          verses2,
          isBetweenGroups
        );

        for (const pairing of termPairings) {
          const pairingKey = PairingGenerator.createPairingKey(
            pairing,
            term1,
            term2
          );

          if (!processedPairings.has(pairingKey)) {
            pairings.push(pairing);
            processedPairings.add(pairingKey);
          }
        }
      }
    }

    return pairings;
  }

  static generateBetweenGroupsPairings(
    group1Terms: string[],
    group2Terms: string[],
    termToVerses: Map<string, Verse[]>
  ): VersePairing[] {
    const pairings: VersePairing[] = [];
    const processedPairings = new Set<string>();

    for (const term1 of group1Terms) {
      for (const term2 of group2Terms) {
        if (pairings.length >= CONFIG.MAX_TOTAL_PAIRINGS) {
          console.warn(
            `Reached maximum pairing limit (${CONFIG.MAX_TOTAL_PAIRINGS}). Stopping to prevent memory issues.`
          );
          return pairings;
        }

        if (SearchUtils.areTermsSameWord(term1, term2)) continue;

        const verses1 = termToVerses.get(term1) || [];
        const verses2 = termToVerses.get(term2) || [];

        const termPairings = PairingGenerator.findPairingsForTerms(
          term1,
          term2,
          verses1,
          verses2,
          true
        );

        for (const pairing of termPairings) {
          const pairingKey = PairingGenerator.createPairingKey(
            pairing,
            term1,
            term2
          );

          if (!processedPairings.has(pairingKey)) {
            pairings.push(pairing);
            processedPairings.add(pairingKey);
          }
        }
      }
    }

    return pairings;
  }

  private static createPairingKey(
    pairing: VersePairing,
    term1: string,
    term2: string
  ): string {
    if (pairing.proximity === 0) {
      return `same-${pairing.verses[0].position}-${term1}-${term2}`;
    }

    const positions = pairing.verses.map((v) => v.position);
    return `pair-${Math.min(...positions)}-${Math.max(
      ...positions
    )}-${term1}-${term2}`;
  }
}

class KJVParser {
  private verses: Verse[] = [];
  private wordIndex: Map<string, Verse[]> = new Map();
  private verseSearcher?: VerseSearcher;

  async fetchAndParse(): Promise<void> {
    try {
      const response = await fetch('/kjv.txt');
      if (!response.ok) {
        throw new Error(`Failed to load KJV text: ${response.status}`);
      }
      const text = await response.text();
      this.parseText(text);
      this.buildWordIndex();
      this.verseSearcher = new VerseSearcher(this.verses);
    } catch (error) {
      console.error('Error loading KJV text:', error);
      throw error;
    }
  }

  private parseText(text: string): void {
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith('KJV') ||
        trimmed.includes('BibleProtector.com')
      ) {
        continue;
      }

      const verseMatch = trimmed.match(/^(.+?)\s+(\d+):(\d+)\s+(.+)$/);
      if (verseMatch) {
        const [, book, chapter, verseNum, verseText] = verseMatch;

        this.verses.push({
          book: book.trim(),
          chapter: parseInt(chapter),
          verse: parseInt(verseNum),
          text: verseText.trim(),
          reference: `${book.trim()} ${chapter}:${verseNum}`,
          position: this.verses.length,
        });
      }
    }
  }

  private buildWordIndex(): void {
    for (const verse of this.verses) {
      const words = SearchUtils.getWords(verse.text);
      for (const word of words) {
        const normalizedWord = word.toLowerCase();
        if (!this.wordIndex.has(normalizedWord)) {
          this.wordIndex.set(normalizedWord, []);
        }
        this.wordIndex.get(normalizedWord)!.push(verse);
      }
    }
  }

  searchWords(
    searchTerms: string[],
    filters: SearchFilters = {}
  ): SearchResult[] {
    const allResults = new Map<string, SearchResult>();
    const validTerms = SearchUtils.validateAndLimitTerms(searchTerms);

    for (const term of validTerms) {
      for (const verse of this.verses) {
        if (!FilterUtils.shouldIncludeVerse(verse, filters)) continue;

        const matches = RegexUtils.findMatches(verse.text, term);
        if (matches.length > 0) {
          const key = `${verse.book}-${verse.chapter}-${verse.verse}`;
          if (!allResults.has(key)) {
            allResults.set(key, { verse, matches: [] });
          }

          for (const match of matches) {
            allResults.get(key)!.matches.push({
              term,
              start: match.start,
              end: match.end,
            });
          }
        }
      }
    }

    const results = Array.from(allResults.values());
    results.sort((a, b) => a.verse.position - b.verse.position);
    return results;
  }

  findVersePairings(
    searchTerms: string[],
    filters: SearchFilters = {}
  ): VersePairing[] {
    if (!this.verseSearcher) throw new Error('Parser not initialized');

    const limitedTerms = SearchUtils.validateAndLimitTerms(searchTerms);
    const termToVerses = this.verseSearcher.findVersesForTerms(
      limitedTerms,
      filters
    );

    return PairingGenerator.generateAllPairings(termToVerses);
  }

  findVersePairingsBetweenGroups(
    group1Terms: string[],
    group2Terms: string[],
    filters: SearchFilters = {}
  ): VersePairing[] {
    if (!this.verseSearcher) throw new Error('Parser not initialized');

    const limitedGroup1 = SearchUtils.validateAndLimitTerms(
      group1Terms,
      CONFIG.MAX_SEARCH_TERMS_PER_GROUP
    );
    const limitedGroup2 = SearchUtils.validateAndLimitTerms(
      group2Terms,
      CONFIG.MAX_SEARCH_TERMS_PER_GROUP
    );

    const allTerms = [...limitedGroup1, ...limitedGroup2];
    const termToVerses = this.verseSearcher.findVersesForTerms(
      allTerms,
      filters
    );

    return PairingGenerator.generateBetweenGroupsPairings(
      limitedGroup1,
      limitedGroup2,
      termToVerses
    );
  }

  getVerses(): Verse[] {
    return [...this.verses];
  }

  isLoaded(): boolean {
    return this.verses.length > 0;
  }
}

// Singleton instance
const kjvParser = new KJVParser();

export { kjvParser };
export default kjvParser;
