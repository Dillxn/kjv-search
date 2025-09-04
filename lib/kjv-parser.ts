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
