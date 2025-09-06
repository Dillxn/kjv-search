'use client';

import { SearchResult, VersePairing } from '../../lib/kjv-parser';
import { VirtualScroll } from '../../lib/virtual-scroll';
import { UnifiedHighlighter } from '../../lib/highlighting';
import { SearchResultsHelper } from '../../lib/search-utils';

interface SearchResultsProps {
  results: SearchResult[];
  pairings: VersePairing[];
  activeTab: 'all' | 'pairings';
  searchTerms: string;
  pairingsSearchTerms: string;
  containerHeight: number;
  isDarkMode: boolean;
  scrollPositionKey: string;
  showGraph: boolean;
  selectedConnections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions: number[];
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
  scrollPositionKey,
  showGraph,
  selectedConnections,
  onAddToGraph,
}: SearchResultsProps) {
  const getSearchTermsArray = () => {
    return SearchResultsHelper.processSearchString(searchTerms);
  };

  const renderResult = (result: SearchResult) => (
    <div
      key={`${result.verse.book}-${result.verse.chapter}-${result.verse.verse}`}
      className={`border-l-2 pl-2 py-1 mb-1 ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}
    >
      <div className='mb-0.5'>
        <span
          className={`font-semibold text-xs ${
            isDarkMode ? 'text-gray-200' : 'text-gray-800'
          }`}
        >
          {result.verse.reference}
        </span>
      </div>
      <div
        className={`text-xs leading-snug ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
        dangerouslySetInnerHTML={{
          __html: UnifiedHighlighter.highlightText(result.verse.text, {
            matches: result.matches,
            isDarkMode,
          }),
        }}
      />
    </div>
  );

  const renderPairing = (pairing: VersePairing) => {
    const searchTermsArray = getSearchTermsArray();
    const pairingsSearchTermsArray = SearchResultsHelper.processSearchString(pairingsSearchTerms);

    // Function to highlight text with both color schemes
    const highlightPairingText = (text: string): string => {
      return UnifiedHighlighter.highlightText(text, {
        mainTerms: searchTermsArray,
        pairingsTerms: pairingsSearchTermsArray,
        isDarkMode,
        usePairingsColors: true,
      });
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
        className={`border-l-2 flex justify-between items-start pl-2 py-1 mb-1 ${isDarkMode ? 'border-green-400' : 'border-green-500'}`}
      >
        <div className="flex-1">
          {pairing.verses.map((verse, verseIndex) => (
            <div
              key={verse.position}
              className={verseIndex > 0 ? 'mt-1' : ''}
            >
              <div className='mb-0.5'>
                <span
                  className={`font-semibold text-xs ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  {verse.reference}
                </span>
              </div>
              <div
                className={`text-xs leading-snug ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
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
            {SearchResultsHelper.getEmptyStateMessage(searchTerms, 'results')}
          </p>
        </div>
      );
    }

    return (
      <VirtualScroll
        items={results}
        containerHeight={containerHeight}
        renderItem={renderResult}
        estimatedItemHeight={60}
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
            {SearchResultsHelper.getEmptyStateMessage(searchTerms, 'pairings')}
          </p>
        </div>
      );
    }

    return (
      <VirtualScroll
        items={pairings}
        containerHeight={containerHeight}
        renderItem={renderPairing}
        estimatedItemHeight={60}
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg shadow-md p-2`}
        localStorageKey={scrollPositionKey}
      />
    );
  }
}