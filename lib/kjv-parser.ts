export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
  position: number; // Position in the original text for canonical ordering
}

export interface SearchResult {
  verse: Verse;
  matches: string[];
}

export interface VersePairing {
  verses: Verse[];
  term1: string;
  term2: string;
  proximity: number; // 0 for same verse, otherwise verse distance
}

// Book name mappings to canonical order
const BOOK_ORDER: Record<string, number> = {
  'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
  'Joshua': 6, 'Judges': 7, 'Ruth': 8, '1 Samuel': 9, '2 Samuel': 10,
  '1 Kings': 11, '2 Kings': 12, '1 Chronicles': 13, '2 Chronicles': 14,
  'Ezra': 15, 'Nehemiah': 16, 'Esther': 17, 'Job': 18, 'Psalms': 19, 'Proverbs': 20,
  'Ecclesiastes': 21, 'Song of Solomon': 22, 'Isaiah': 23, 'Jeremiah': 24,
  'Lamentations': 25, 'Ezekiel': 26, 'Daniel': 27, 'Hosea': 28, 'Joel': 29,
  'Amos': 30, 'Obadiah': 31, 'Jonah': 32, 'Micah': 33, 'Nahum': 34,
  'Habakkuk': 35, 'Zephaniah': 36, 'Haggai': 37, 'Zechariah': 38, 'Malachi': 39,
  'Matthew': 40, 'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44,
  'Romans': 45, '1 Corinthians': 46, '2 Corinthians': 47, 'Galatians': 48,
  'Ephesians': 49, 'Philippians': 50, 'Colossians': 51, '1 Thessalonians': 52,
  '2 Thessalonians': 53, '1 Timothy': 54, '2 Timothy': 55, 'Titus': 56,
  'Philemon': 57, 'Hebrews': 58, 'James': 59, '1 Peter': 60, '2 Peter': 61,
  '1 John': 62, '2 John': 63, '3 John': 64, 'Jude': 65, 'Revelation': 66
};

class KJVParser {
  private verses: Verse[] = [];
  private wordIndex: Map<string, Verse[]> = new Map();

  async fetchAndParse(): Promise<void> {
    try {
      const response = await fetch('/kjv.txt');
      if (!response.ok) {
        throw new Error(`Failed to load KJV text: ${response.status}`);
      }
      const text = await response.text();
      this.parseText(text);
      this.buildWordIndex();
    } catch (error) {
      console.error('Error loading KJV text:', error);
      throw error;
    }
  }

  private parseText(text: string): void {
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip header lines
      if (trimmed.startsWith('KJV') || trimmed.includes('BibleProtector.com')) {
        continue;
      }

      // Parse verse lines with format: "Book Chapter:Verse Text"
      const verseMatch = trimmed.match(/^(.+?)\s+(\d+):(\d+)\s+(.+)$/);
      if (verseMatch) {
        const [, book, chapter, verseNum, verseText] = verseMatch;


        const verse: Verse = {
          book: book.trim(),
          chapter: parseInt(chapter),
          verse: parseInt(verseNum),
          text: verseText.trim(),
          reference: `${book.trim()} ${chapter}:${verseNum}`,
          position: this.verses.length
        };

        this.verses.push(verse);
      }
    }
  }


  private buildWordIndex(): void {
    for (const verse of this.verses) {
      const words = this.getWords(verse.text);
      for (const word of words) {
        const normalizedWord = word.toLowerCase();
        if (!this.wordIndex.has(normalizedWord)) {
          this.wordIndex.set(normalizedWord, []);
        }
        this.wordIndex.get(normalizedWord)!.push(verse);
      }
    }
  }

  private getWords(text: string): string[] {
    // Remove punctuation and split into words
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  searchWords(searchTerms: string[]): SearchResult[] {
    const allResults = new Map<string, SearchResult>();

    for (const term of searchTerms) {
      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) continue;

      // For partial matching, check if the term is a substring of any indexed words
      const matchingVerses = new Set<Verse>();

      // First try exact match
      const exactMatches = this.wordIndex.get(normalizedTerm) || [];
      exactMatches.forEach(verse => matchingVerses.add(verse));

      // Then try partial matches
      if (normalizedTerm.length >= 2) {
        for (const [indexedWord, verses] of this.wordIndex.entries()) {
          if (indexedWord.startsWith(normalizedTerm)) {
            verses.forEach(verse => matchingVerses.add(verse));
          }
        }
      }

      for (const verse of matchingVerses) {
        const key = `${verse.book}-${verse.chapter}-${verse.verse}`;
        if (!allResults.has(key)) {
          allResults.set(key, {
            verse,
            matches: []
          });
        }
        allResults.get(key)!.matches.push(term);
      }
    }

    // Convert to array and preserve the order from the original text
    const results = Array.from(allResults.values());
    results.sort((a, b) => a.verse.position - b.verse.position);

    return results;
  }

  findVersePairings(searchTerms: string[]): VersePairing[] {
    const pairings: VersePairing[] = [];
    const termToVerses = new Map<string, Verse[]>();
    const MAX_TOTAL_PAIRINGS = 10000; // Overall limit to prevent memory explosion
    const MAX_SEARCH_TERMS = 8; // Limit number of terms to prevent combinatorial explosion

    // Limit the number of search terms to prevent combinatorial explosion
    const limitedTerms = searchTerms.slice(0, MAX_SEARCH_TERMS);
    if (searchTerms.length > MAX_SEARCH_TERMS) {
      console.warn(`Limited search terms from ${searchTerms.length} to ${MAX_SEARCH_TERMS} to prevent memory issues`);
    }

    // Get verses for each search term
    for (const term of limitedTerms) {
      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) continue;

      const matchingVerses = new Set<Verse>();

      // First try exact match
      const exactMatches = this.wordIndex.get(normalizedTerm) || [];
      exactMatches.forEach(verse => matchingVerses.add(verse));

      // Then try partial matches
      if (normalizedTerm.length >= 2) {
        for (const [indexedWord, verses] of this.wordIndex.entries()) {
          if (indexedWord.startsWith(normalizedTerm)) {
            verses.forEach(verse => matchingVerses.add(verse));
          }
        }
      }

      termToVerses.set(term, Array.from(matchingVerses));
    }

    const termArray = Array.from(termToVerses.keys());

    // Generate all possible pairs of terms
    for (let i = 0; i < termArray.length; i++) {
      for (let j = i + 1; j < termArray.length; j++) {
        if (pairings.length >= MAX_TOTAL_PAIRINGS) {
          console.warn(`Reached maximum pairing limit (${MAX_TOTAL_PAIRINGS}). Stopping to prevent memory issues.`);
          break;
        }

        const term1 = termArray[i];
        const term2 = termArray[j];
        const verses1 = termToVerses.get(term1) || [];
        const verses2 = termToVerses.get(term2) || [];

        // Find pairings between these two terms
        const pairPairings = this.findPairingsForTerms(term1, term2, verses1, verses2);
        pairings.push(...pairPairings);
      }
      if (pairings.length >= MAX_TOTAL_PAIRINGS) break;
    }

    return pairings;
  }

  private findPairingsForTerms(term1: string, term2: string, verses1: Verse[], verses2: Verse[]): VersePairing[] {
    const pairings: VersePairing[] = [];
    const processed = new Set<string>();
    const MAX_PAIRINGS_PER_TERM_PAIR = 5000; // Limit to prevent memory explosion

    // Find same verse pairings first (proximity 0)
    for (const verse of verses1) {
      if (pairings.length >= MAX_PAIRINGS_PER_TERM_PAIR) break;

      if (verses2.some(v => v.position === verse.position)) {
        const key = `same-${verse.position}`;
        if (!processed.has(key)) {
          pairings.push({
            verses: [verse],
            term1,
            term2,
            proximity: 0
          });
          processed.add(key);
        }
      }
    }

    // Find different verse pairings with proximity limits
    const MAX_PROXIMITY = 100; // Only find pairings within 100 verses of each other
    for (const verse1 of verses1) {
      if (pairings.length >= MAX_PAIRINGS_PER_TERM_PAIR) break;

      for (const verse2 of verses2) {
        if (pairings.length >= MAX_PAIRINGS_PER_TERM_PAIR) break;

        if (verse1.position === verse2.position) continue; // Skip same verse (already handled above)

        // Skip if verses are too far apart
        const proximity = Math.abs(verse1.position - verse2.position);
        if (proximity > MAX_PROXIMITY) continue;

        const key = `pair-${Math.min(verse1.position, verse2.position)}-${Math.max(verse1.position, verse2.position)}`;
        if (!processed.has(key)) {
          pairings.push({
            verses: verse1.position < verse2.position ? [verse1, verse2] : [verse2, verse1],
            term1,
            term2,
            proximity
          });
          processed.add(key);
        }
      }
    }

    return pairings;
  }

  private compareVerses(a: Verse, b: Verse): number {
    const bookOrderA = BOOK_ORDER[a.book] || 999;
    const bookOrderB = BOOK_ORDER[b.book] || 999;

    if (bookOrderA !== bookOrderB) {
      return bookOrderA - bookOrderB;
    }

    if (a.chapter !== b.chapter) {
      return a.chapter - b.chapter;
    }

    return a.verse - b.verse;
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
