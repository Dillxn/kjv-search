import { Verse, SearchResult, VersePairing, SearchFilters } from './types/verse';
import { SearchUtils } from './search/search-utils';
import { VerseSearcher } from './search/verse-searcher';
import { PairingGenerator } from './pairing/pairing-generator';

export class KJVParser {
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
      this.parseKJVText(text);
      this.buildWordIndex();
      this.verseSearcher = new VerseSearcher(this.verses);
    } catch (error) {
      console.error('Error fetching KJV text:', error);
      throw error;
    }
  }

  private parseKJVText(text: string): void {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse format: "Book Chapter:Verse Text"
      const match = trimmedLine.match(/^(.+?)\s+(\d+):(\d+)\s+(.+)$/);
      if (match) {
        const [, book, chapter, verseNum, verseText] = match;
        
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

  searchWords(terms: string[], filters: SearchFilters = {}): SearchResult[] {
    if (!this.verseSearcher) throw new Error('Parser not initialized');
    
    const limitedTerms = SearchUtils.validateAndLimitTerms(terms);
    return this.verseSearcher.searchVerses(limitedTerms, filters);
  }

  async findVersePairings(terms: string[], filters: SearchFilters = {}): Promise<VersePairing[]> {
    if (!this.verseSearcher) throw new Error('Parser not initialized');

    const limitedTerms = SearchUtils.validateAndLimitTerms(terms);
    const termToVerses = this.verseSearcher.findVersesForTerms(limitedTerms, filters);

    return PairingGenerator.generateAllPairingsAsync(termToVerses, false);
  }

  findVersePairingsBetweenGroups(
    group1Terms: string[],
    group2Terms: string[],
    filters: SearchFilters = {}
  ): VersePairing[] {
    if (!this.verseSearcher) throw new Error('Parser not initialized');

    const limitedGroup1 = SearchUtils.validateAndLimitTerms(group1Terms);
    const limitedGroup2 = SearchUtils.validateAndLimitTerms(group2Terms);

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

  async findVersePairingsBetweenGroupsAsync(
    group1Terms: string[],
    group2Terms: string[],
    filters: SearchFilters = {},
    onProgress?: (processed: number, total: number, pairings: number) => void
  ): Promise<VersePairing[]> {
    if (!this.verseSearcher) throw new Error('Parser not initialized');

    const limitedGroup1 = SearchUtils.validateAndLimitTerms(group1Terms);
    const limitedGroup2 = SearchUtils.validateAndLimitTerms(group2Terms);

    const allTerms = [...limitedGroup1, ...limitedGroup2];
    const termToVerses = this.verseSearcher.findVersesForTerms(
      allTerms,
      filters
    );

    return PairingGenerator.generateBetweenGroupsPairingsAsync(
      limitedGroup1,
      limitedGroup2,
      termToVerses,
      onProgress
    );
  }

  getVerses(): Verse[] {
    return this.verses;
  }

  getWordIndex(): Map<string, Verse[]> {
    return this.wordIndex;
  }

  isLoaded(): boolean {
    return this.verses.length > 0;
  }
}

// Re-export types for convenience
export * from './types/verse';
export * from './data/testament-books';