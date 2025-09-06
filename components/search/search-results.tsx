'use client';

import { SearchResult, VersePairing } from '../../lib/kjv-parser';
import { VirtualScroll } from '../../lib/virtual-scroll';
import { UnifiedHighlighter } from '../../lib/highlighting';
import { SearchResultsHelper } from '../../lib/search-utils';
import { PairingDisplay } from '../shared/pairing-display';

interface SearchResultsProps {
  results: SearchResult[];
  pairings: VersePairing[];
  activeTab: 'all' | 'pairings';
  searchTerms: string;
  pairingsSearchTerms: string;
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
    return (
      <PairingDisplay
        pairing={pairing}
        searchTerms={searchTerms}
        pairingsSearchTerms={pairingsSearchTerms}
        isDarkMode={isDarkMode}
        showGraph={showGraph}
        selectedConnections={selectedConnections}
        onToggleGraph={onToggleGraph}
      />
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
