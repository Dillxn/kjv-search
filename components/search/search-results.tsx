'use client';

import { SearchResult, VersePairing } from '../../lib/kjv-parser';
import { VirtualScroll } from '../../lib/virtual-scroll';
import { highlightText, highlightTextWithRegex } from '../../lib/highlighting-utils';

interface SearchResultsProps {
  results: SearchResult[];
  pairings: VersePairing[];
  activeTab: 'all' | 'pairings';
  searchTerms: string;
  pairingsSearchTerms: string;
  containerHeight: number;
  isDarkMode: boolean;
  compactMode: boolean;
  scrollPositionKey: string;
  showGraph: boolean;
  selectedConnections: Array<{
    word1: string;
    word2: string;
    reference: string;
  }>;
  onAddToGraph: (pairing: VersePairing) => void;
}

export function SearchResults({
  results,
  pairings,
  activeTab,
  searchTerms,
  pairingsSearchTerms,
  containerHeight,
  isDarkMode,
  compactMode,
  scrollPositionKey,
  showGraph,
  selectedConnections,
  onAddToGraph,
}: SearchResultsProps) {
  const getSearchTermsArray = () => {
    return searchTerms
      .split(' ')
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term);
  };

  const renderResult = (result: SearchResult) => (
    <div
      key={`${result.verse.book}-${result.verse.chapter}-${result.verse.verse}`}
      className={`border-l-2 ${
        compactMode ? 'pl-1.5 py-0.5 mb-0.5' : 'pl-2 py-1 mb-1'
      } ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}
    >
      <div className={compactMode ? 'mb-0' : 'mb-0.5'}>
        <span
          className={`font-semibold text-xs ${
            isDarkMode ? 'text-gray-200' : 'text-gray-800'
          }`}
        >
          {result.verse.reference}
        </span>
      </div>
      <div
        className={`${
          compactMode ? 'text-xs leading-tight' : 'text-xs leading-snug'
        } ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
        dangerouslySetInnerHTML={{
          __html: highlightText(result.verse.text, result.matches, isDarkMode),
        }}
      />
    </div>
  );

  const renderPairing = (pairing: VersePairing) => {
    const searchTermsArray = getSearchTermsArray();
    const pairingsSearchTermsArray = pairingsSearchTerms
      .split(' ')
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term);

    // Function to highlight text with both color schemes
    const highlightPairingText = (text: string): string => {
      // For pairings, we need to combine matches from both search groups
      // Since pairing results don't include match bounds, we'll need to fall back to regex for now
      return highlightTextWithRegex(
        text,
        searchTermsArray,
        pairingsSearchTermsArray,
        isDarkMode
      );
    };

    // Check if this specific pairing is already in the graph
    const versePositions = pairing.verses.map(v => v.position);
    const isInGraph = Array.isArray(selectedConnections) && selectedConnections.some(conn => {
      const positionsMatch = conn.versePositions && 
        conn.versePositions.length === versePositions.length &&
        conn.versePositions.every(pos => versePositions.includes(pos));
      
      const wordsMatch = (conn.word1 === pairing.term1 && conn.word2 === pairing.term2) ||
                        (conn.word1 === pairing.term2 && conn.word2 === pairing.term1);
      
      return wordsMatch && positionsMatch;
    });

    return (
      <div
        key={`${pairing.term1}-${pairing.term2}-${pairing.verses.map(v => v.position).join('-')}`}
        className={`border-l-2 flex justify-between items-start ${
          compactMode ? 'pl-1.5 py-0.5 mb-0.5' : 'pl-2 py-1 mb-1'
        } ${isDarkMode ? 'border-green-400' : 'border-green-500'}`}
      >
        <div className="flex-1">
          {pairing.verses.map((verse, verseIndex) => (
            <div
              key={verse.position}
              className={verseIndex > 0 ? (compactMode ? 'mt-0.5' : 'mt-1') : ''}
            >
              <div className={compactMode ? 'mb-0' : 'mb-0.5'}>
                <span
                  className={`font-semibold text-xs ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  {verse.reference}
                </span>
              </div>
              <div
                className={`${
                  compactMode ? 'text-xs leading-tight' : 'text-xs leading-snug'
                } ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                dangerouslySetInnerHTML={{
                  __html: highlightPairingText(verse.text),
                }}
              />
            </div>
          ))}
        </div>
        {showGraph && (
          <button
            onClick={() => onAddToGraph(pairing)}
            disabled={isInGraph}
            className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
              isInGraph
                ? isDarkMode
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } transition-colors`}
            title={isInGraph ? 'Already in graph' : 'Add to graph'}
          >
            {isInGraph ? '✓' : '+'}
          </button>
        )}
      </div>
    );
  };

  if (activeTab === 'all') {
    if (results.length === 0) {
      return (
        <div
          className={`flex items-center justify-center h-full ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <p className='text-sm'>
            {searchTerms.trim().length < 2
              ? 'Enter at least 2 characters to search'
              : 'No results found'}
          </p>
        </div>
      );
    }

    return (
      <VirtualScroll
        items={results}
        containerHeight={containerHeight}
        renderItem={renderResult}
        estimatedItemHeight={compactMode ? 40 : 60}
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg shadow-md p-2`}
        localStorageKey={scrollPositionKey}
      />
    );
  } else {
    if (pairings.length === 0) {
      return (
        <div
          className={`flex items-center justify-center h-full ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <p className='text-sm'>
            {searchTerms.trim().length < 2
              ? 'Enter at least 2 characters to search'
              : 'No pairings found'}
          </p>
        </div>
      );
    }

    return (
      <VirtualScroll
        items={pairings}
        containerHeight={containerHeight}
        renderItem={renderPairing}
        estimatedItemHeight={compactMode ? 40 : 60}
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg shadow-md p-2`}
        localStorageKey={scrollPositionKey}
      />
    );
  }
}