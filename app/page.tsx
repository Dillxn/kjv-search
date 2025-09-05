'use client';

import { useState, useEffect, useCallback } from 'react';
import { kjvParser, SearchResult, VersePairing, SearchFilters, OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS } from '../lib/kjv-parser';
import { VirtualScroll } from '../lib/virtual-scroll';

const HIGHLIGHT_COLORS_LIGHT = [
  'bg-yellow-200 text-yellow-900',
  'bg-blue-200 text-blue-900',
  'bg-green-200 text-green-900',
  'bg-red-200 text-red-900',
  'bg-purple-200 text-purple-900',
  'bg-pink-200 text-pink-900',
  'bg-indigo-200 text-indigo-900',
  'bg-orange-200 text-orange-900'
];

const HIGHLIGHT_COLORS_DARK = [
  'bg-yellow-300 text-yellow-900',
  'bg-blue-300 text-blue-900',
  'bg-green-300 text-green-900',
  'bg-red-300 text-red-900',
  'bg-purple-300 text-purple-900',
  'bg-pink-300 text-pink-900',
  'bg-indigo-300 text-indigo-900',
  'bg-orange-300 text-orange-900'
];

// Separate colors for pairings search (second search box)
const PAIRINGS_HIGHLIGHT_COLORS_LIGHT = [
  'border-teal-500 text-teal-700 bg-transparent',
  'border-cyan-500 text-cyan-700 bg-transparent',
  'border-lime-500 text-lime-700 bg-transparent',
  'border-amber-500 text-amber-700 bg-transparent',
  'border-rose-500 text-rose-700 bg-transparent',
  'border-violet-500 text-violet-700 bg-transparent',
  'border-emerald-500 text-emerald-700 bg-transparent',
  'border-sky-500 text-sky-700 bg-transparent'
];

const PAIRINGS_HIGHLIGHT_COLORS_DARK = [
  'border-teal-400 text-teal-300 bg-transparent',
  'border-cyan-400 text-cyan-300 bg-transparent',
  'border-lime-400 text-lime-300 bg-transparent',
  'border-amber-400 text-amber-300 bg-transparent',
  'border-rose-400 text-rose-300 bg-transparent',
  'border-violet-400 text-violet-300 bg-transparent',
  'border-emerald-400 text-emerald-300 bg-transparent',
  'border-sky-400 text-sky-300 bg-transparent'
];

export default function Home() {
  const [searchTerms, setSearchTerms] = useState<string>('');
  const [debouncedSearchTerms, setDebouncedSearchTerms] = useState<string>('');
  const [pairingsSearchTerms, setPairingsSearchTerms] = useState<string>('');
  const [debouncedPairingsSearchTerms, setDebouncedPairingsSearchTerms] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pairings, setPairings] = useState<VersePairing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editorRef, setEditorRef] = useState<HTMLDivElement | null>(null);
  const [pairingsEditorRef, setPairingsEditorRef] = useState<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const [activeTab, setActiveTab] = useState<'all' | 'pairings'>('all');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [selectedTestament, setSelectedTestament] = useState<'all' | 'old' | 'new'>('all');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCounts, setFilterCounts] = useState<{
    total: number;
    oldTestament: number;
    newTestament: number;
    books: Record<string, number>;
  }>({ total: 0, oldTestament: 0, newTestament: 0, books: {} });

  const getHighlightColors = useCallback(() => {
    return isDarkMode ? HIGHLIGHT_COLORS_DARK : HIGHLIGHT_COLORS_LIGHT;
  }, [isDarkMode]);

  const getPairingsHighlightColors = useCallback(() => {
    return isDarkMode ? PAIRINGS_HIGHLIGHT_COLORS_DARK : PAIRINGS_HIGHLIGHT_COLORS_LIGHT;
  }, [isDarkMode]);

  const formatTextWithColors = useCallback((text: string) => {
    if (!text.trim()) {
      return '';
    }

    const colors = getHighlightColors();
    // Split by spaces but preserve the spaces
    const parts = text.split(/(\s+)/);
    let wordIndex = 0;

    return parts.map(part => {
      if (/^\s+$/.test(part)) {
        // This is whitespace, return as-is
        return part;
      } else if (part.trim()) {
        // This is a word, wrap it in a colored span
        const colorClass = colors[wordIndex % colors.length];
        wordIndex++;
        return `<span class="${colorClass} px-0.5 rounded">${part}</span>`;
      }
      return part;
    }).join('');
  }, [getHighlightColors]);

  const formatPairingsTextWithColors = useCallback((text: string) => {
    if (!text.trim()) {
      return '';
    }

    const colors = getPairingsHighlightColors();
    // Split by spaces but preserve the spaces
    const parts = text.split(/(\s+)/);
    let wordIndex = 0;

    return parts.map(part => {
      if (/^\s+$/.test(part)) {
        // This is whitespace, return as-is
        return part;
      } else if (part.trim()) {
        // This is a word, wrap it in a colored span
        const colorClass = colors[wordIndex % colors.length];
        wordIndex++;
        return `<span class="${colorClass} border px-0.5 rounded">${part}</span>`;
      }
      return part;
    }).join('');
  }, [getPairingsHighlightColors]);

  useEffect(() => {
    const initializeKJV = async () => {
      try {
        await kjvParser.fetchAndParse();
        setIsInitialized(true);
      } catch (err) {
        setError('Failed to load KJV text. Please refresh the page.');
        console.error(err);
      }
    };

    initializeKJV();
  }, []);

  // Load saved preferences from localStorage and set container height
  useEffect(() => {
    const savedSearchTerms = localStorage.getItem('kjv-search-terms');
    const savedPairingsSearchTerms = localStorage.getItem('kjv-pairings-search-terms');
    const savedDarkMode = localStorage.getItem('kjv-dark-mode');
    const savedSelectedTestament = localStorage.getItem('kjv-selected-testament');
    const savedSelectedBooks = localStorage.getItem('kjv-selected-books');
    const savedShowFilters = localStorage.getItem('kjv-show-filters');
    const savedActiveTab = localStorage.getItem('kjv-active-tab');

    if (savedSearchTerms) {
      setSearchTerms(savedSearchTerms);
    }

    if (savedPairingsSearchTerms) {
      setPairingsSearchTerms(savedPairingsSearchTerms);
    }

    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode === 'true');
    }

    if (savedSelectedTestament && ['all', 'old', 'new'].includes(savedSelectedTestament)) {
      setSelectedTestament(savedSelectedTestament as 'all' | 'old' | 'new');
    }

    if (savedSelectedBooks) {
      try {
        const books = JSON.parse(savedSelectedBooks);
        if (Array.isArray(books) && books.every(book => typeof book === 'string')) {
          setSelectedBooks(books);
        }
      } catch {
        console.warn('Failed to parse saved selected books from localStorage');
      }
    }

    if (savedShowFilters) {
      setShowFilters(savedShowFilters === 'true');
    }

    if (savedActiveTab && ['all', 'pairings'].includes(savedActiveTab)) {
      setActiveTab(savedActiveTab as 'all' | 'pairings');
    }

    // Set initial container height
    const updateHeight = () => {
      setContainerHeight(window.innerHeight - 200);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Save search terms to localStorage
  useEffect(() => {
    if (searchTerms) {
      localStorage.setItem('kjv-search-terms', searchTerms);
    }
  }, [searchTerms]);

  // Save pairings search terms to localStorage
  useEffect(() => {
    if (pairingsSearchTerms) {
      localStorage.setItem('kjv-pairings-search-terms', pairingsSearchTerms);
    }
  }, [pairingsSearchTerms]);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('kjv-dark-mode', isDarkMode.toString());
  }, [isDarkMode]);

  // Save selected testament to localStorage
  useEffect(() => {
    localStorage.setItem('kjv-selected-testament', selectedTestament);
  }, [selectedTestament]);

  // Save selected books to localStorage
  useEffect(() => {
    localStorage.setItem('kjv-selected-books', JSON.stringify(selectedBooks));
  }, [selectedBooks]);

  // Save show filters preference to localStorage
  useEffect(() => {
    localStorage.setItem('kjv-show-filters', showFilters.toString());
  }, [showFilters]);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('kjv-active-tab', activeTab);
  }, [activeTab]);

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
        setFilterCounts({ total: 0, oldTestament: 0, newTestament: 0, books: {} });
        return;
      }

      const terms = debouncedSearchTerms.split(' ').map(term => term.trim()).filter(term => term);

      // Calculate total results
      const totalResults = kjvParser.searchWords(terms, {});

      // Calculate testament counts
      const oldTestamentResults = kjvParser.searchWords(terms, { testament: 'old' });
      const newTestamentResults = kjvParser.searchWords(terms, { testament: 'new' });

      // Calculate book counts
      const bookCounts: Record<string, number> = {};
      const allBooks = [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
      allBooks.forEach(book => {
        const bookResults = kjvParser.searchWords(terms, { books: [book] });
        bookCounts[book] = bookResults.length;
      });

      setFilterCounts({
        total: totalResults.length,
        oldTestament: oldTestamentResults.length,
        newTestament: newTestamentResults.length,
        books: bookCounts
      });
    };

    updateFilterCounts();
  }, [debouncedSearchTerms, isInitialized]);

  // Debounce search terms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerms(searchTerms);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerms]);

  // Debounce pairings search terms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPairingsSearchTerms(pairingsSearchTerms);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [pairingsSearchTerms]);

  // Realtime search effect
  useEffect(() => {
    const performRealtimeSearch = async () => {
      if (!debouncedSearchTerms.trim() || debouncedSearchTerms.trim().length < 2) {
        setResults([]);
        setError('');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const terms = debouncedSearchTerms.split(' ').map(term => term.trim()).filter(term => term);
        console.log('Search terms:', terms, 'Original:', debouncedSearchTerms);
        const searchResults = kjvParser.searchWords(terms, searchFilters);

        // For pairings, use both search boxes when on pairings tab
        let versePairings: VersePairing[] = [];
        if (activeTab === 'pairings') {
          const mainTerms = debouncedSearchTerms.split(' ').map(term => term.trim()).filter(term => term);
          const pairingsTerms = debouncedPairingsSearchTerms.split(' ').map(term => term.trim()).filter(term => term);

          if (mainTerms.length > 0 && pairingsTerms.length > 0) {
            versePairings = kjvParser.findVersePairingsBetweenGroups(mainTerms, pairingsTerms, searchFilters).sort((a, b) => {
              // Sort by proximity (same verse first), then by first verse position
              if (a.proximity !== b.proximity) {
                return a.proximity - b.proximity;
              }
              return a.verses[0].position - b.verses[0].position;
            });
          }
        } else {
          // For all results tab, use traditional pairings logic
          versePairings = kjvParser.findVersePairings(terms, searchFilters).sort((a, b) => {
            // Sort by proximity (same verse first), then by first verse position
            if (a.proximity !== b.proximity) {
              return a.proximity - b.proximity;
            }
            return a.verses[0].position - b.verses[0].position;
          });
        }

        console.log('Search results:', searchResults.length, 'Pairings:', versePairings.length);
        setResults(searchResults);
        setPairings(versePairings);
      } catch (err) {
        setError('Search failed. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isInitialized) {
      performRealtimeSearch();
    }
  }, [debouncedSearchTerms, debouncedPairingsSearchTerms, activeTab, isInitialized, searchFilters]);

  // Update contentEditable when searchTerms changes externally (like from localStorage)
  useEffect(() => {
    if (editorRef && document.activeElement !== editorRef) {
      editorRef.innerHTML = formatTextWithColors(searchTerms);
    }
  }, [searchTerms, isDarkMode, editorRef, formatTextWithColors]);

  // Update pairings contentEditable when pairingsSearchTerms changes externally (like from localStorage)
  useEffect(() => {
    if (pairingsEditorRef && document.activeElement !== pairingsEditorRef) {
      pairingsEditorRef.innerHTML = formatPairingsTextWithColors(pairingsSearchTerms);
    }
  }, [pairingsSearchTerms, isDarkMode, pairingsEditorRef, formatPairingsTextWithColors]);


  const getSearchTermsArray = () => {
    return searchTerms.split(' ').map(term => term.trim().toLowerCase()).filter(term => term);
  };

  const getAvailableBooks = () => {
    switch (selectedTestament) {
      case 'old':
        return OLD_TESTAMENT_BOOKS;
      case 'new':
        return NEW_TESTAMENT_BOOKS;
      default:
        return [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
    }
  };

  const handleTestamentChange = (testament: 'all' | 'old' | 'new') => {
    setSelectedTestament(testament);
    setSelectedBooks([]); // Clear book selection when testament changes
  };

  const handleBookToggle = (book: string) => {
    setSelectedBooks(prev => {
      if (prev.includes(book)) {
        return prev.filter(b => b !== book);
      } else {
        return [...prev, book];
      }
    });
  };

  // Helper functions to get cached result counts for filter badges
  const getTotalResults = (): number => filterCounts.total;

  const getResultsByTestament = (testament: 'old' | 'new'): number => {
    return testament === 'old' ? filterCounts.oldTestament : filterCounts.newTestament;
  };

  const getResultsByBook = (book: string): number => {
    return filterCounts.books[book] || 0;
  };


  const renderPairing = (pairing: VersePairing) => {
    const searchTermsArray = getSearchTermsArray();
    const pairingsSearchTermsArray = pairingsSearchTerms.split(' ').map(term => term.trim().toLowerCase()).filter(term => term);

    // Function to highlight text with both color schemes
    const highlightPairingText = (text: string): string => {
      // First highlight with main search terms (original colors)
      let result = highlightText(text, [], searchTermsArray, false);

      // Then highlight with pairings search terms (pairings colors)
      result = highlightText(result, [], pairingsSearchTermsArray, true);

      return result;
    };

    return (
      <div className={`border-l-2 pl-3 py-1.5 mb-1.5 flex flex-col justify-center ${isDarkMode ? 'border-green-400' : 'border-green-500'}`}>

        {pairing.verses.map((verse, verseIndex) => (
          <div key={verse.position} className={verseIndex > 0 ? 'mt-1.5' : ''}>
            <div className="mb-0.5">
              <span className={`font-semibold text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {verse.reference}
              </span>
            </div>
            <div
              className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              dangerouslySetInnerHTML={{
                __html: highlightPairingText(verse.text)
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const highlightText = (text: string, matches: string[], searchTerms: string[], usePairingsColors: boolean = false): string => {
    const colors = usePairingsColors ? getPairingsHighlightColors() : getHighlightColors();

    // Create a map of search terms to colors
    const termToColor = new Map<string, string>();
    searchTerms.forEach((term, index) => {
      const normalizedTerm = term.toLowerCase().trim();
      if (normalizedTerm) {
        termToColor.set(normalizedTerm, colors[index % colors.length]);
      }
    });

    let result = text;

    // For each search term, find and highlight all occurrences using word-boundary matching
    for (const [term, colorClass] of termToColor.entries()) {
      if (term.length >= 2) {
        // Escape special regex characters
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Create a regex that matches the term at word boundaries only (partial matches allowed)
        // This ensures 'faith' matches 'faithful' but 'heir' doesn't match 'their'
        const regex = new RegExp(`\\b(${escapedTerm}\\w*)`, 'gi');
        const borderClass = usePairingsColors ? 'border' : '';
        result = result.replace(regex, `<mark class="${colorClass} ${borderClass} px-0.5 rounded">$1</mark>`);
      }
    }

    return result;
  };

  if (!isInitialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-4 w-4 border-b-2 mx-auto mb-1 ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading KJV text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-2 py-4 h-full flex flex-col">
        <div className={`rounded-lg shadow-md p-2 mb-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-2">
            <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>KJV Bible Search</h1>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-0.5 rounded-full text-sm ${isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-700'} hover:opacity-80 transition-opacity`}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="mb-2">
            <label htmlFor="search" className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Enter search words (separated by spaces):
            </label>
            <div className="relative">
              <div
                ref={setEditorRef}
                contentEditable
                suppressContentEditableWarning={true}
                data-placeholder="Start typing to search... (min 2 characters)"
                onInput={(e) => {
                  const text = e.currentTarget.textContent || '';
                  setSearchTerms(text);

                  // Re-apply styling after input
                  if (e.currentTarget === document.activeElement) {
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0) return;

                    // Get cursor position relative to the text content
                    const range = selection.getRangeAt(0);
                    let cursorOffset = 0;
                    
                    // Calculate the actual text offset by walking through all text nodes
                    const walker = document.createTreeWalker(
                      e.currentTarget,
                      NodeFilter.SHOW_TEXT,
                      null
                    );
                    
                    let node;
                    let found = false;
                    while (node = walker.nextNode()) {
                      if (node === range.startContainer) {
                        cursorOffset += range.startOffset;
                        found = true;
                        break;
                      }
                      cursorOffset += node.textContent?.length || 0;
                    }

                    // Update HTML with colored spans
                    e.currentTarget.innerHTML = formatTextWithColors(text);

                    // Restore cursor position
                    if (found && text) {
                      try {
                        // Walk through the new DOM structure to find the correct position
                        const newWalker = document.createTreeWalker(
                          e.currentTarget,
                          NodeFilter.SHOW_TEXT,
                          null
                        );
                        
                        let currentOffset = 0;
                        let targetNode = null;
                        let targetOffset = 0;
                        
                        while (node = newWalker.nextNode()) {
                          const nodeLength = node.textContent?.length || 0;
                          if (currentOffset + nodeLength >= cursorOffset) {
                            targetNode = node;
                            targetOffset = cursorOffset - currentOffset;
                            break;
                          }
                          currentOffset += nodeLength;
                        }

                        if (targetNode) {
                          const newRange = document.createRange();
                          newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
                          newRange.collapse(true);
                          selection.removeAllRanges();
                          selection.addRange(newRange);
                        }
                      } catch {
                        // Fallback: place cursor at the calculated position in plain text
                        const textNodes = [];
                        const fallbackWalker = document.createTreeWalker(
                          e.currentTarget,
                          NodeFilter.SHOW_TEXT,
                          null
                        );
                        let fallbackNode;
                        while (fallbackNode = fallbackWalker.nextNode()) {
                          textNodes.push(fallbackNode);
                        }
                        
                        if (textNodes.length > 0) {
                          const lastNode = textNodes[textNodes.length - 1];
                          const newRange = document.createRange();
                          newRange.setStart(lastNode, Math.min(cursorOffset, lastNode.textContent?.length || 0));
                          newRange.collapse(true);
                          selection.removeAllRanges();
                          selection.addRange(newRange);
                        }
                      }
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  } else if (e.key === ' ') {
                    // Handle space key to ensure proper word separation
                    e.preventDefault();
                    const target = e.currentTarget;
                    const text = target.textContent || '';
                    const newText = text + ' ';
                    setSearchTerms(newText);

                    // Update HTML and place cursor at end
                    setTimeout(() => {
                      if (target && target.isConnected) {
                        target.innerHTML = formatTextWithColors(newText);
                        // Place cursor at end
                        const selection = window.getSelection();
                        if (selection) {
                          const range = document.createRange();
                          range.selectNodeContents(target);
                          range.collapse(false);
                          selection.removeAllRanges();
                          selection.addRange(range);
                        }
                      }
                    }, 0);
                  }
                }}

                className={`w-full px-1.5 py-1 pr-6 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[28px] outline-none placeholder-editor ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'border-gray-300 text-black bg-white'
                }`}
                style={{ 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              />
              {isLoading && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className={`animate-spin rounded-full h-3 w-3 border-b-2 ${
                    isDarkMode ? 'border-blue-400' : 'border-blue-600'
                  }`}></div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="mb-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>Filters</span>
                {(selectedTestament !== 'all' || selectedBooks.length > 0) && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                    isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  }`}>
                    {(selectedTestament !== 'all' ? 1 : 0) + selectedBooks.length}
                  </span>
                )}
              </span>
              <span className={`transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}>
                ⌄
              </span>
            </button>

            {/* Collapsible Filter Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showFilters ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}>
              <div className="space-y-2">
                {/* Testament Filters */}
                <div>
                  <div className={`text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Filter by Testament:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'all', label: 'All Testaments', count: getTotalResults() },
                      { key: 'old', label: 'Old Testament', count: getResultsByTestament('old') },
                      { key: 'new', label: 'New Testament', count: getResultsByTestament('new') }
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => handleTestamentChange(key as 'all' | 'old' | 'new')}
                        className={`px-1 py-0.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-0.5 ${
                          selectedTestament === key
                            ? isDarkMode
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-blue-500 text-white shadow-sm'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        <span className={selectedTestament === key ? 'text-white' : ''}>{label}</span>
                        <span className={`px-0.5 py-0.5 rounded-full text-xs font-semibold ${
                          selectedTestament === key
                            ? 'bg-white bg-opacity-25 text-gray-800'
                            : isDarkMode
                              ? 'bg-gray-600 text-gray-300'
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {count.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Book Filters */}
                <div>
                  <div className={`text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Filter by Book {selectedBooks.length > 0 && `(${selectedBooks.length} selected)`}:
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {getAvailableBooks().map(book => {
                      const isSelected = selectedBooks.includes(book);
                      const count = getResultsByBook(book);
                      return (
                        <button
                          key={book}
                          onClick={() => handleBookToggle(book)}
                          className={`px-1 py-0.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-0.5 whitespace-nowrap ${
                            isSelected
                              ? isDarkMode
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-green-500 text-white shadow-sm'
                              : count === 0
                                ? isDarkMode
                                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                                  : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                                : isDarkMode
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                          }`}
                          disabled={count === 0}
                          title={count === 0 ? `${book} has no results for current search` : `Toggle ${book} filter`}
                        >
                          <span className={isSelected ? 'text-white' : ''}>{book}</span>
                          <span className={`px-0.5 py-0.5 rounded-full text-xs font-semibold ${
                            isSelected
                              ? 'bg-white bg-opacity-25 text-gray-800'
                              : count === 0
                                ? isDarkMode
                                  ? 'bg-gray-700 text-gray-500'
                                  : 'bg-gray-300 text-gray-400'
                                : isDarkMode
                                  ? 'bg-gray-600 text-gray-300'
                                  : 'bg-gray-200 text-gray-600'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedBooks.length > 0 && (
                    <button
                      onClick={() => setSelectedBooks([])}
                      className={`mt-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border border-gray-300'
                      }`}
                    >
                      Clear ({selectedBooks.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className={`mt-1.5 p-1 rounded text-xs ${isDarkMode ? 'bg-red-900 border border-red-700 text-red-300' : 'bg-red-100 border border-red-400 text-red-700'}`}>
              {error}
            </div>
          )}
        </div>

        {(results.length > 0 || pairings.length > 0) && (
          <div className={`rounded-lg shadow-md p-2 flex flex-col flex-1 min-h-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="mb-2 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Found {activeTab === 'all' ? results.length : pairings.length} {activeTab === 'all' ? 'verses' : 'pairings'}
                </h2>
                <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      activeTab === 'all'
                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Results
                  </button>
                  <button
                    onClick={() => setActiveTab('pairings')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      activeTab === 'pairings'
                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Verse Pairings
                  </button>
                </div>
              </div>

              {activeTab === 'pairings' && (
                <div className="mb-2">
                  <label htmlFor="pairings-search" className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Pairings Search Group 2 (optional - leave empty for traditional pairings):
                  </label>
                  <div className="relative">
                    <div
                      ref={setPairingsEditorRef}
                      contentEditable
                      suppressContentEditableWarning={true}
                      data-placeholder="Enter second group of search words... (min 2 characters)"
                      onInput={(e) => {
                        const text = e.currentTarget.textContent || '';
                        setPairingsSearchTerms(text);

                        // Re-apply styling after input
                        if (e.currentTarget === document.activeElement) {
                          const selection = window.getSelection();
                          if (!selection || selection.rangeCount === 0) return;

                          // Get cursor position relative to the text content
                          const range = selection.getRangeAt(0);
                          let cursorOffset = 0;

                          // Calculate the actual text offset by walking through all text nodes
                          const walker = document.createTreeWalker(
                            e.currentTarget,
                            NodeFilter.SHOW_TEXT,
                            null
                          );

                          let node;
                          let found = false;
                          while (node = walker.nextNode()) {
                            if (node === range.startContainer) {
                              cursorOffset += range.startOffset;
                              found = true;
                              break;
                            }
                            cursorOffset += node.textContent?.length || 0;
                          }

                          // Update HTML with colored spans
                          e.currentTarget.innerHTML = formatPairingsTextWithColors(text);

                          // Restore cursor position
                          if (found && text) {
                            try {
                              // Walk through the new DOM structure to find the correct position
                              const newWalker = document.createTreeWalker(
                                e.currentTarget,
                                NodeFilter.SHOW_TEXT,
                                null
                              );

                              let currentOffset = 0;
                              let targetNode = null;
                              let targetOffset = 0;

                              while (node = newWalker.nextNode()) {
                                const nodeLength = node.textContent?.length || 0;
                                if (currentOffset + nodeLength >= cursorOffset) {
                                  targetNode = node;
                                  targetOffset = cursorOffset - currentOffset;
                                  break;
                                }
                                currentOffset += nodeLength;
                              }

                              if (targetNode) {
                                const newRange = document.createRange();
                                newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                              }
                            } catch {
                              // Fallback: place cursor at the calculated position in plain text
                              const textNodes = [];
                              const fallbackWalker = document.createTreeWalker(
                                e.currentTarget,
                                NodeFilter.SHOW_TEXT,
                                null
                              );
                              let fallbackNode;
                              while (fallbackNode = fallbackWalker.nextNode()) {
                                textNodes.push(fallbackNode);
                              }

                              if (textNodes.length > 0) {
                                const lastNode = textNodes[textNodes.length - 1];
                                const newRange = document.createRange();
                                newRange.setStart(lastNode, Math.min(cursorOffset, lastNode.textContent?.length || 0));
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                              }
                            }
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        } else if (e.key === ' ') {
                          // Handle space key to ensure proper word separation
                          e.preventDefault();
                          const target = e.currentTarget;
                          const text = target.textContent || '';
                          const newText = text + ' ';
                          setPairingsSearchTerms(newText);

                          // Update HTML and place cursor at end
                          setTimeout(() => {
                            if (target && target.isConnected) {
                              target.innerHTML = formatPairingsTextWithColors(newText);
                              // Place cursor at end
                              const selection = window.getSelection();
                              if (selection) {
                                const range = document.createRange();
                                range.selectNodeContents(target);
                                range.collapse(false);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }
                            }
                          }, 0);
                        }
                      }}

                      className={`w-full px-1.5 py-1 pr-6 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[28px] outline-none placeholder-editor ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'border-gray-300 text-black bg-white'
                      }`}
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    />
                    {isLoading && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className={`animate-spin rounded-full h-3 w-3 border-b-2 ${
                          isDarkMode ? 'border-blue-400' : 'border-blue-600'
                        }`}></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'all' ? (
              <VirtualScroll
                items={results}
                containerHeight={containerHeight}
                className="flex-1 scrollbar-visible"
                estimatedItemHeight={60}
                renderItem={(result) => (
                  <div className={`border-l-2 pl-3 py-1.5 mb-1.5 flex flex-col justify-center ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}>
                    <div className="mb-0.5">
                      <span className={`font-semibold text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {result.verse.reference}
                      </span>
                    </div>
                    <div
                      className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      dangerouslySetInnerHTML={{
                        __html: highlightText(result.verse.text, result.matches, getSearchTermsArray())
                      }}
                    />
                  </div>
                )}
              />
            ) : (
              <VirtualScroll
                items={pairings}
                containerHeight={containerHeight}
                className="flex-1 scrollbar-visible"
                estimatedItemHeight={80}
                renderItem={renderPairing}
              />
            )}
          </div>
        )}

        {results.length === 0 && pairings.length === 0 && searchTerms && searchTerms.trim().length >= 2 && !isLoading && (
          <div className={`rounded-lg shadow-md p-2 text-center flex-1 flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No verses found containing the specified words.</p>
          </div>
        )}

        {searchTerms && searchTerms.trim().length < 2 && !isLoading && (
          <div className={`rounded-lg shadow-md p-2 text-center flex-1 flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Type at least 2 characters to start searching...</p>
          </div>
        )}
      </div>
    </div>
  );
}
