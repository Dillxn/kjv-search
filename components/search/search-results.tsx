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
  onToggleGraph: (pairing: VersePairing) => void;
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
  onToggleGraph,
}: SearchResultsProps) {
  const getSearchTermsArray = () => {
    return SearchResultsHelper.processSearchString(searchTerms);
  };

  const renderResult = (result: SearchResult) => (
    <div
      key={`${result.verse.book}-${result.verse.chapter}-${result.verse.verse}`}
      className={`border-l-2 pl-2 py-1 mb-1 ${
        isDarkMode ? 'border-blue-400' : 'border-blue-500'
      }`}
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
        className={`text-xs leading-snug ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}
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
    const pairingsSearchTermsArray =
      SearchResultsHelper.processSearchString(pairingsSearchTerms);

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
    const versePositions = pairing.verses.map((v) => v.position);
    const isInGraph =
      Array.isArray(selectedConnections) &&
      (() => {
        // Handle consolidated pairings
        if (pairing.allTermPairs && pairing.allTermPairs.length > 1) {
          // Parse all term pairs and check if ALL are in the graph
          const termPairs = pairing.allTermPairs.map((pairStr) => {
            const [term1, term2] = pairStr.split(' ↔ ');
            return { term1: term1.trim(), term2: term2.trim() };
          });

          return termPairs.every(({ term1, term2 }) => {
            return selectedConnections.some((conn) => {
              const positionsMatch =
                conn.versePositions &&
                conn.versePositions.length === versePositions.length &&
                conn.versePositions.every((pos) =>
                  versePositions.includes(pos)
                );

              const wordsMatch =
                (conn.word1 === term1 && conn.word2 === term2) ||
                (conn.word1 === term2 && conn.word2 === term1);

              return wordsMatch && positionsMatch;
            });
          });
        } else {
          // Handle single pairing (original logic)
          return selectedConnections.some((conn) => {
            const positionsMatch =
              conn.versePositions &&
              conn.versePositions.length === versePositions.length &&
              conn.versePositions.every((pos) => versePositions.includes(pos));

            const wordsMatch =
              (conn.word1 === pairing.term1 && conn.word2 === pairing.term2) ||
              (conn.word1 === pairing.term2 && conn.word2 === pairing.term1);

            return wordsMatch && positionsMatch;
          });
        }
      })();

    return (
      <div
        key={`${pairing.term1}-${pairing.term2}-${pairing.verses
          .map((v) => v.position)
          .join('-')}`}
        className={`border-l-2 flex justify-between items-start pl-2 py-1 mb-1 ${
          isDarkMode ? 'border-green-400' : 'border-green-500'
        }`}
      >
        <div className='flex-1'>
          {/* Show consolidated term pairs if available */}
          {pairing.allTermPairs && pairing.allTermPairs.length > 1 && (
            <div className='mb-2'>
              <div
                className={`text-xs font-medium ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-600'
                }`}
              >
                Word pairs: {pairing.allTermPairs.join(', ')}
              </div>
            </div>
          )}

          {pairing.verses.map((verse, verseIndex) => (
            <div key={verse.position} className={verseIndex > 0 ? 'mt-1' : ''}>
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
                className={`text-xs leading-snug ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
                dangerouslySetInnerHTML={{
                  __html: highlightPairingText(verse.text),
                }}
              />
            </div>
          ))}
        </div>
        {showGraph && (
          <label
            className='ml-2 flex items-center cursor-pointer'
            title={isInGraph ? 'Remove from graph' : 'Add to graph'}
          >
            <input
              type='checkbox'
              checked={isInGraph}
              onChange={() => onToggleGraph(pairing)}
              className={`w-4 h-4 rounded border-2 transition-colors ${
                isDarkMode
                  ? 'border-gray-500 bg-gray-700 checked:bg-blue-600 checked:border-blue-600'
                  : 'border-gray-300 bg-white checked:bg-blue-500 checked:border-blue-500'
              }`}
            />
          </label>
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
