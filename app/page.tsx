'use client';

import { useState, useEffect } from 'react';
import { kjvParser, SearchResult } from '../lib/kjv-parser';

const HIGHLIGHT_COLORS = [
  'bg-yellow-200 text-yellow-900',
  'bg-blue-200 text-blue-900',
  'bg-green-200 text-green-900',
  'bg-red-200 text-red-900',
  'bg-purple-200 text-purple-900',
  'bg-pink-200 text-pink-900',
  'bg-indigo-200 text-indigo-900',
  'bg-orange-200 text-orange-900'
];

export default function Home() {
  const [searchTerms, setSearchTerms] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');

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

  const handleSearch = async () => {
    if (!searchTerms.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const terms = searchTerms.split(',').map(term => term.trim()).filter(term => term);
      const searchResults = kjvParser.searchWords(terms);
      setResults(searchResults);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSearchTermsArray = () => {
    return searchTerms.split(',').map(term => term.trim().toLowerCase()).filter(term => term);
  };

  const highlightText = (text: string, matches: string[], searchTerms: string[]): string => {
    let highlightedText = text;

    matches.forEach((match) => {
      const termIndex = searchTerms.indexOf(match.toLowerCase());
      const colorClass = HIGHLIGHT_COLORS[termIndex % HIGHLIGHT_COLORS.length];
      const regex = new RegExp(`(${match})`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark class="${colorClass} px-1 rounded">$1</mark>`);
    });

    return highlightedText;
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KJV text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">KJV Bible Search</h1>
          <p className="text-gray-600">Search for multiple words and see them highlighted in their verses</p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Enter search words (separated by commas):
            </label>
            <input
              id="search"
              type="text"
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              placeholder="faith, hope, love"
              className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading || !searchTerms.trim()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Found {results.length} verses
              </h2>
              <div className="flex flex-wrap gap-2">
                {searchTerms.split(',').map((term, index) => {
                  const trimmedTerm = term.trim();
                  if (!trimmedTerm) return null;
                  return (
                    <span
                      key={index}
                      className={`px-2 py-1 rounded text-sm font-medium ${HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length]}`}
                    >
                      {trimmedTerm}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">
                      {result.verse.reference}
                    </span>
                    <div className="flex gap-1">
                      {result.matches.map((match, matchIndex) => (
                        <span
                          key={matchIndex}
                          className={`px-2 py-1 rounded text-xs font-medium ${HIGHLIGHT_COLORS[getSearchTermsArray().indexOf(match.toLowerCase()) % HIGHLIGHT_COLORS.length]}`}
                        >
                          {match}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(result.verse.text, result.matches, getSearchTermsArray())
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && searchTerms && !isLoading && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No verses found containing the specified words.</p>
          </div>
        )}
      </div>
    </div>
  );
}
