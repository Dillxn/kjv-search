'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [editorRef, setEditorRef] = useState<HTMLDivElement | null>(null);

  const getHighlightColors = useCallback(() => {
    return isDarkMode ? HIGHLIGHT_COLORS_DARK : HIGHLIGHT_COLORS_LIGHT;
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
  }, [isDarkMode, getHighlightColors]);

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
        console.log('Search terms:', terms, 'Original:', debouncedSearchTerms);
        const searchResults = kjvParser.searchWords(terms);
        console.log('Search results:', searchResults.length);
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

  // Update contentEditable when searchTerms changes externally (like from localStorage)
  useEffect(() => {
    if (editorRef && document.activeElement !== editorRef) {
      editorRef.innerHTML = formatTextWithColors(searchTerms);
    }
  }, [searchTerms, isDarkMode, editorRef, formatTextWithColors]);


  const getSearchTermsArray = () => {
    return searchTerms.split(' ').map(term => term.trim().toLowerCase()).filter(term => term);
  };

  const highlightText = (text: string, matches: string[], searchTerms: string[]): string => {
    const colors = getHighlightColors();

    // Create a map of search terms to colors
    const termToColor = new Map<string, string>();
    searchTerms.forEach((term, index) => {
      const normalizedTerm = term.toLowerCase().trim();
      if (normalizedTerm) {
        termToColor.set(normalizedTerm, colors[index % colors.length]);
      }
    });

    let result = text;

    // For each search term, find and highlight all occurrences (including partial matches)
    for (const [term, colorClass] of termToColor.entries()) {
      if (term.length >= 2) {
        // Escape special regex characters
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Create a regex that matches the term as a substring, case insensitive
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        result = result.replace(regex, `<mark class="${colorClass} px-0.5 rounded">$1</mark>`);
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
