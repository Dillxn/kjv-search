import { OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS } from '../data/testament-books';
import { Verse, SearchFilters } from '../types/verse';

export class FilterUtils {
  static getBooksForTestament(testament?: 'old' | 'new'): string[] {
    if (testament === 'old') return OLD_TESTAMENT_BOOKS;
    if (testament === 'new') return NEW_TESTAMENT_BOOKS;
    return [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
  }

  static shouldIncludeVerse(verse: Verse, filters: SearchFilters): boolean {
    // Testament filter
    if (filters.testament) {
      const allowedBooks = this.getBooksForTestament(filters.testament);
      if (!allowedBooks.includes(verse.book)) {
        return false;
      }
    }

    // Specific books filter
    if (filters.books && filters.books.length > 0) {
      if (!filters.books.includes(verse.book)) {
        return false;
      }
    }

    return true;
  }
}