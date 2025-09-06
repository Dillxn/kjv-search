'use client';

import { useState, useEffect, useCallback } from 'react';
import { kjvParser, SearchResult, VersePairing, SearchFilters, OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS } from '../lib/kjv-parser';

interface FilterCounts {
  total: number;
  oldTestament: number;
  newTestament: number;
  books: Record<string, number>;
}

export function useSearchState() {
  const [searchTerms, setSearchTerms] = useState<string>('');
  const [debouncedSearchTerms, setDebouncedSearchTerms] = useState<string>('');
  const [pairingsSearchTerms, setPairingsSearchTerms] = useState<string>('');
  const [debouncedPairingsSearchTerms, setDebouncedPairingsSearchTerms] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pairings, setPairings] = useState<VersePairing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [selectedTestament, setSelectedTestament] = useState<'all' | 'old' | 'new'>('all');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    total: 0,
    oldTestament: 0,
    newTestament: 0,
    books: {},
  });

  // Debounce search terms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerms(searchTerms);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerms]);

  // Debounce pairings search terms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPairingsSearchTerms(pairingsSearchTerms);
    }, 500);
    return () => clearTimeout(timer);
  }, [pairingsSearchTerms]);

  // Update search filters when testament or book selections change
  useEffect(() => {
    const filters: SearchFilters = {};

    if (selectedTestament !== 'all') {
      filters.testament = selectedTestament;
    }

    if (selectedBooks.length > 0) {
      filters.books = selectedBooks;
    }

    setSearchFilters(filters);
  }, [selectedTestament, selectedBooks]);

  // Calculate filter counts when search terms change
  useEffect(() => {
    const updateFilterCounts = () => {
      if (!debouncedSearchTerms.trim() || debouncedSearchTerms.trim().length < 2) {
        setFilterCounts({
          total: 0,
          oldTestament: 0,
          newTestament: 0,
          books: {},
        });
        return;
      }

      // Check if parser is loaded before trying to search
      if (!kjvParser.isLoaded()) {
        return;
      }

      const terms = debouncedSearchTerms
        .split(' ')
        .map((term) => term.trim())
        .filter((term) => term);

      // Calculate total results
      const totalResults = kjvParser.searchWords(terms, {});

      // Calculate testament counts
      const oldTestamentResults = kjvParser.searchWords(terms, { testament: 'old' });
      const newTestamentResults = kjvParser.searchWords(terms, { testament: 'new' });

      // Calculate book counts
      const bookCounts: Record<string, number> = {};
      const allBooks = [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
      allBooks.forEach((book) => {
        const bookResults = kjvParser.searchWords(terms, { books: [book] });
        bookCounts[book] = bookResults.length;
      });

      setFilterCounts({
        total: totalResults.length,
        oldTestament: oldTestamentResults.length,
        newTestament: newTestamentResults.length,
        books: bookCounts,
      });
    };

    updateFilterCounts();
  }, [debouncedSearchTerms]);

  // Perform search
  const performSearch = useCallback(async (activeTab: 'all' | 'pairings') => {
    if (!debouncedSearchTerms.trim() || debouncedSearchTerms.trim().length < 2) {
      setResults([]);
      setPairings([]);
      setError('');
      return;
    }

    // Check if parser is loaded before trying to search
    if (!kjvParser.isLoaded()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const terms = debouncedSearchTerms
        .split(' ')
        .map((term) => term.trim())
        .filter((term) => term);

      const searchResults = kjvParser.searchWords(terms, searchFilters);

      // For pairings, use both search boxes when on pairings tab
      let versePairings: VersePairing[] = [];
      if (activeTab === 'pairings') {
        const mainTerms = debouncedSearchTerms
          .split(/\s+/)
          .map((term) => term.trim())
          .filter((term) => term);
        const pairingsTerms = debouncedPairingsSearchTerms
          .split(/\s+/)
          .map((term) => term.trim())
          .filter((term) => term);


        if (mainTerms.length > 0 && pairingsTerms.length > 0) {

          versePairings = kjvParser
            .findVersePairingsBetweenGroups(mainTerms, pairingsTerms, searchFilters);
          versePairings = versePairings.sort((a, b) => {
            if (a.proximity !== b.proximity) {
              return a.proximity - b.proximity;
            }
            return a.verses[0].position - b.verses[0].position;
          });
        }
      } else {
        // For all results tab, use traditional pairings logic
        versePairings = kjvParser
          .findVersePairings(terms, searchFilters)
          .sort((a, b) => {
            if (a.proximity !== b.proximity) {
              return a.proximity - b.proximity;
            }
            return a.verses[0].position - b.verses[0].position;
          });
      }

      setResults(searchResults);
      setPairings(versePairings);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerms, debouncedPairingsSearchTerms, searchFilters]);

  return {
    searchTerms,
    setSearchTerms,
    pairingsSearchTerms,
    setPairingsSearchTerms,
    debouncedSearchTerms,
    debouncedPairingsSearchTerms,
    results,
    pairings,
    isLoading,
    error,
    selectedTestament,
    setSelectedTestament,
    selectedBooks,
    setSelectedBooks,
    filterCounts,
    performSearch,
  };
}