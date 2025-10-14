'use client';

import { SearchResult, VersePairing } from '../../lib/kjv-parser';
import { VirtualScroll } from '../../lib/virtual-scroll';
import { UnifiedHighlighter } from '../../lib/highlighting';
import { SearchResultsHelper } from '../../lib/search-utils';
import { PairingDisplay } from '../shared/pairing-display';
import { VerseContextTooltip } from '../shared/verse-context-tooltip';

interface SearchResultsProps {
  results: SearchResult[];
  pairings: VersePairing[];
  linkings: VersePairing[];
  activeTab: 'all' | 'linking';
  searchTerms: string;
  isDarkMode: boolean;
  scrollPositionKey: string;
  showGraph: boolean;
  selectedConnections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions: number[];
  }>;
  onToggleGraph: (connection: { word1: string; word2: string; reference: string; versePositions: number[] }) => void;
  onUpdateCardinality?: (connectionKey: string, cardinality: import('../ui/cardinality-toggle').CardinalityType) => void;
  connectionCardinalities?: Record<string, import('../ui/cardinality-toggle').CardinalityType>;
}

export function SearchResults({
  results,
  pairings,
  linkings,
  activeTab,
  searchTerms,
  isDarkMode,
  scrollPositionKey,
  showGraph,
  selectedConnections,
  onToggleGraph,
  onUpdateCardinality,
  connectionCardinalities,
}: SearchResultsProps) {
  const getSearchTermsArray = () => {
    return SearchResultsHelper.processSearchString(searchTerms);
  };

  const renderResult = (result: SearchResult) => (
    <VerseContextTooltip
      key={`${result.verse.book}-${result.verse.chapter}-${result.verse.verse}`}
      verse={result.verse}
      isDarkMode={isDarkMode}
      contextBefore={1}
      contextAfter={1}
    >
      <div
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
              mainTerms: getSearchTermsArray(),
              isDarkMode,
              maintainInputOrder: true,
              usePairingsColors: false, // Use main colors for regular search results
            }),
          }}
        />
      </div>
    </VerseContextTooltip>
  );

  const renderPairing = (pairing: VersePairing) => {
    return (
      <PairingDisplay
        pairing={pairing}
        searchTerms={searchTerms}
        pairingsSearchTerms=""
        isDarkMode={isDarkMode}
        showGraph={showGraph}
        selectedConnections={selectedConnections}
        onToggleGraph={onToggleGraph}
        onUpdateCardinality={onUpdateCardinality}
        connectionCardinalities={connectionCardinalities}
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
        overscan={10} // Increased overscan for smoother scrolling
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-sm shadow-md p-2`}
        localStorageKey={scrollPositionKey}
      />
    );
  } else {
    // linking tab
    if (linkings.length === 0) {
      return (
        <div
          className={`flex items-center justify-center h-full ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <p className='text-sm'>
            {SearchResultsHelper.getEmptyStateMessage(searchTerms, 'linkings')}
          </p>
        </div>
      );
    }

    return (
      <VirtualScroll
        items={linkings}
        renderItem={renderPairing}
        estimatedItemHeight={60}
        overscan={10} // Increased overscan for smoother scrolling
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-sm shadow-md p-2`}
        localStorageKey={scrollPositionKey}
      />
    );
  }
}
