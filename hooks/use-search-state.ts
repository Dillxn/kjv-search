'use client';

import { useState, useEffect, useCallback } from 'react';
import { kjvParser, SearchResult, VersePairing, SearchFilters, OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS } from '../lib';
import { APP_CONFIG } from '../lib/constants';
import { SearchTermProcessor, SearchStateValidator } from '../lib/search-utils';
import { searchCache } from '../lib/search-cache';

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
  const [maxProximity, setMaxProximity] = useState<number>(APP_CONFIG.PAIRINGS.MAX_PROXIMITY);
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
    }, APP_CONFIG.SEARCH.DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchTerms]);

  // Debounce pairings search terms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPairingsSearchTerms(pairingsSearchTerms);
    }, APP_CONFIG.SEARCH.DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [pairingsSearchTerms]);

  // Update search filters when testament, book selections, or proximity change
  useEffect(() => {
    const filters: SearchFilters = {};

    if (selectedTestament !== 'all') {
      filters.testament = selectedTestament;
    }

    if (selectedBooks.length > 0) {
      filters.books = selectedBooks;
    }

    if (maxProximity !== APP_CONFIG.PAIRINGS.MAX_PROXIMITY) {
      filters.maxProximity = maxProximity;
    }

    setSearchFilters(filters);
  }, [selectedTestament, selectedBooks, maxProximity]);

  // Calculate filter counts when search terms change
  useEffect(() => {
    const updateFilterCounts = () => {
      if (!SearchStateValidator.canPerformSearch(debouncedSearchTerms)) {
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

      const terms = SearchTermProcessor.processSearchString(debouncedSearchTerms);

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

  // Internal search function that can use either debounced or immediate terms
  const performSearchInternal = useCallback((
    activeTab: 'all' | 'pairings',
    searchTermsToUse: string,
    pairingsSearchTermsToUse: string
  ) => {
    if (!SearchStateValidator.canPerformSearch(searchTermsToUse)) {
      setResults([]);
      setPairings([]);
      setError('');
      return;
    }

    // Check if parser is loaded before trying to search
    if (!kjvParser.isLoaded()) {
      return;
    }

    // Check cache first
    const cached = searchCache.get(
      searchTermsToUse,
      pairingsSearchTermsToUse,
      activeTab,
      selectedTestament,
      selectedBooks,
      maxProximity
    );

    if (cached) {
      // Use cached results
      setResults(cached.results);
      setPairings(cached.pairings);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const terms = SearchTermProcessor.processSearchString(searchTermsToUse);

      const searchResults = kjvParser.searchWords(terms, searchFilters);

      // For pairings, use both search boxes when on pairings tab
      let versePairings: VersePairing[] = [];
      if (activeTab === 'pairings') {
        const { mainTerms, pairingsTerms, hasValidMain, hasValidPairings } = 
          SearchTermProcessor.processBothSearchStrings(searchTermsToUse, pairingsSearchTermsToUse);

        if (hasValidMain && hasValidPairings) {
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
          .findVersePairings(terms, searchFilters);
        versePairings = versePairings.sort((a, b) => {
          if (a.proximity !== b.proximity) {
            return a.proximity - b.proximity;
          }
          return a.verses[0].position - b.verses[0].position;
        });
      }

      // Cache the results
      searchCache.set(
        searchTermsToUse,
        pairingsSearchTermsToUse,
        activeTab,
        selectedTestament,
        selectedBooks,
        maxProximity,
        searchResults,
        versePairings
      );

      setResults(searchResults);
      setPairings(versePairings);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchFilters, selectedTestament, selectedBooks, maxProximity]);

  // Perform search with debounced terms (normal operation)
  const performSearch = useCallback((activeTab: 'all' | 'pairings') => {
    return performSearchInternal(activeTab, debouncedSearchTerms, debouncedPairingsSearchTerms);
  }, [performSearchInternal, debouncedSearchTerms, debouncedPairingsSearchTerms]);

  // Perform immediate search with current terms (for tab switching)
  const performImmediateSearch = useCallback((activeTab: 'all' | 'pairings') => {
    return performSearchInternal(activeTab, searchTerms, pairingsSearchTerms);
  }, [performSearchInternal, searchTerms, pairingsSearchTerms]);

  // Perform search with specific terms (for tab switching with new tab's terms)
  const performSearchWithTerms = useCallback((
    activeTab: 'all' | 'pairings',
    searchTermsToUse: string,
    pairingsSearchTermsToUse: string
  ) => {
    return performSearchInternal(activeTab, searchTermsToUse, pairingsSearchTermsToUse);
  }, [performSearchInternal]);

  // Set results immediately (for instant tab switching with cached results)
  const setResultsImmediately = useCallback((
    newResults: SearchResult[],
    newPairings: VersePairing[]
  ) => {
    setResults(newResults);
    setPairings(newPairings);
    setError('');
  }, []);

  // Clear results immediately and then perform search (for instant tab switching)
  const clearAndSearchWithTerms = useCallback(async (
    activeTab: 'all' | 'pairings',
    searchTermsToUse: string,
    pairingsSearchTermsToUse: string
  ) => {
    // Immediately clear results to prevent showing stale data
    setResults([]);
    setPairings([]);
    setError('');
    
    // Then perform the search
    return performSearchInternal(activeTab, searchTermsToUse, pairingsSearchTermsToUse);
  }, [performSearchInternal]);

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
    maxProximity,
    setMaxProximity,
    filterCounts,
    performSearch,
    performImmediateSearch,
    performSearchWithTerms,
    clearAndSearchWithTerms,
    setResultsImmediately,
  };
}