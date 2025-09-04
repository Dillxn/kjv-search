'use client';

import { useState, useEffect } from 'react';
import { kjvParser, SearchResult } from '../lib/kjv-parser';

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

export default function Home() {
  const [searchTerms, setSearchTerms] = useState<string>('');
  const [debouncedSearchTerms, setDebouncedSearchTerms] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedSearchTerms = localStorage.getItem('kjv-search-terms');
    const savedDarkMode = localStorage.getItem('kjv-dark-mode');

    if (savedSearchTerms) {
      setSearchTerms(savedSearchTerms);
    }

    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, []);

  // Save search terms to localStorage
  useEffect(() => {
    if (searchTerms) {
      localStorage.setItem('kjv-search-terms', searchTerms);
    }
  }, [searchTerms]);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('kjv-dark-mode', isDarkMode.toString());
  }, [isDarkMode]);

  // Debounce search terms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerms(searchTerms);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerms]);

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
        const searchResults = kjvParser.searchWords(terms);
        setResults(searchResults);
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
  }, [debouncedSearchTerms, isInitialized]);


  const getSearchTermsArray = () => {
    return searchTerms.split(' ').map(term => term.trim().toLowerCase()).filter(term => term);
  };

  const getHighlightColors = () => {
    return isDarkMode ? HIGHLIGHT_COLORS_DARK : HIGHLIGHT_COLORS_LIGHT;
  };

  const highlightText = (text: string, matches: string[], searchTerms: string[]): string => {
    const colors = getHighlightColors();

    // Create a map of words to highlight with their corresponding colors
    const wordsToHighlight = new Map<string, string>();

    matches.forEach((match) => {
      const normalizedMatch = match.toLowerCase();
      const termIndex = searchTerms.indexOf(normalizedMatch);
      if (termIndex !== -1) {
        const colorClass = colors[termIndex % colors.length];
        // Use the original match casing for display, but normalized for lookup
        wordsToHighlight.set(match.toLowerCase(), colorClass);
      }
    });

    // Split text into words and punctuation, preserving the original structure
    const parts = text.split(/(\b\w+\b|[^\w\s]+)/g);

    // Process each part and highlight matching words
    const highlightedParts = parts.map(part => {
      const normalizedPart = part.toLowerCase();
      const colorClass = wordsToHighlight.get(normalizedPart);
      if (colorClass && /^\w+$/.test(part)) { // Only highlight word characters
        return `<mark class="${colorClass} px-0.5 rounded">${part}</mark>`;
      }
      return part;
    });

    return highlightedParts.join('');
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
              <div className={`w-full px-1.5 py-1 pr-6 border rounded text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent min-h-[28px] ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'border-gray-300 text-black bg-white'
              }`}>
                <div className="flex flex-wrap gap-1 items-center">
                  {(() => {
                    const words = searchTerms.split(' ');
                    const colors = getHighlightColors();
                    const isTypingNewWord = searchTerms.endsWith(' ');
                    
                    return words.map((word, index) => {
                      const isLastWord = index === words.length - 1;
                      const isCurrentlyTyping = isLastWord && !isTypingNewWord && word;
                      
                      if (!word.trim() && !isCurrentlyTyping) return null;
                      
                      const colorClass = colors[index % colors.length];
                      
                      if (isCurrentlyTyping) {
                        // Show the word being typed with cursor inside the badge
                        return (
                          <span key={index} className={`${colorClass} px-0.5 rounded text-sm relative`}>
                            {word}
                            <span className="cursor-blink">|</span>
                          </span>
                        );
                      } else if (word.trim()) {
                        // Show completed words
                        return (
                          <span key={index} className={`${colorClass} px-0.5 rounded text-sm`}>
                            {word}
                          </span>
                        );
                      }
                      return null;
                    });
                  })()}
                  
                  {/* Show cursor when ready to type new word */}
                  {(searchTerms.endsWith(' ') && searchTerms.trim()) || (!searchTerms) ? (
                    <span className={`cursor-blink text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>|</span>
                  ) : null}
                  
                  <input
                    id="search"
                    type="text"
                    value=""
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue === ' ') {
                        setSearchTerms(searchTerms + ' ');
                      } else if (newValue) {
                        const words = searchTerms.split(' ');
                        words[words.length - 1] = (words[words.length - 1] || '') + newValue;
                        setSearchTerms(words.join(' '));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && e.currentTarget.value === '') {
                        e.preventDefault();
                        const words = searchTerms.split(' ');
                        if (words.length > 0) {
                          const lastWord = words[words.length - 1];
                          if (lastWord) {
                            words[words.length - 1] = lastWord.slice(0, -1);
                            setSearchTerms(words.join(' '));
                          } else if (words.length > 1) {
                            words.pop();
                            setSearchTerms(words.join(' '));
                          }
                        }
                      } else if (e.key === ' ') {
                        e.preventDefault();
                        setSearchTerms(searchTerms + ' ');
                      }
                    }}
                    placeholder={searchTerms ? "" : "Start typing to search... (min 2 characters)"}
                    className={`flex-1 min-w-0 bg-transparent border-none outline-none text-sm caret-transparent ${
                      isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'
                    }`}
                    style={{ minWidth: '20px' }}
                  />
                </div>
              </div>
              {isLoading && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className={`animate-spin rounded-full h-3 w-3 border-b-2 ${
                    isDarkMode ? 'border-blue-400' : 'border-blue-600'
                  }`}></div>
                </div>
              )}
            </div>
          </div>


          {error && (
            <div className={`mt-1.5 p-1 rounded text-xs ${isDarkMode ? 'bg-red-900 border border-red-700 text-red-300' : 'bg-red-100 border border-red-400 text-red-700'}`}>
              {error}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className={`rounded-lg shadow-md p-2 flex flex-col flex-1 min-h-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="mb-2 flex-shrink-0">
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Found {results.length} verses
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {results.map((result, index) => (
                <div key={index} className={`border-l-2 pl-1.5 py-1 ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}>
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
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && searchTerms && searchTerms.trim().length >= 2 && !isLoading && (
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
