'use client';

import { VersePairing } from '../../lib/kjv-parser';
import { UnifiedHighlighter } from '../../lib/highlighting';
import { SearchResultsHelper } from '../../lib/search-utils';

interface PairingDisplayProps {
  pairing: VersePairing;
  searchTerms?: string;
  pairingsSearchTerms?: string;
  isDarkMode: boolean;
  showGraph?: boolean;
  selectedConnections?: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
  onToggleGraph?: (connection: { word1: string; word2: string; reference: string; versePositions: number[] }) => void;
  showCheckbox?: boolean;
}

export function PairingDisplay({
  pairing,
  searchTerms = '',
  pairingsSearchTerms = '',
  isDarkMode,
  showGraph = false,
  selectedConnections = [],
  onToggleGraph,
  showCheckbox = true,
}: PairingDisplayProps) {
  const getSearchTermsArray = () => {
    return SearchResultsHelper.processSearchString(searchTerms);
  };

  const getPairingsSearchTermsArray = () => {
    return SearchResultsHelper.processSearchString(pairingsSearchTerms);
  };

  // Function to highlight text with both color schemes
  const highlightPairingText = (text: string): string => {
    const searchTermsArray = getSearchTermsArray();
    const pairingsSearchTermsArray = getPairingsSearchTermsArray();

    return UnifiedHighlighter.highlightText(text, {
      mainTerms: searchTermsArray,
      pairingsTerms: pairingsSearchTermsArray,
      isDarkMode,
      usePairingsColors: true,
    });
  };

  // Check if this specific pairing is already in the graph
  const versePositions = pairing.verses.map((v) => v.position);
  const isInGraph = Array.isArray(selectedConnections) && selectedConnections.some(conn => {
    const positionsMatch = conn.versePositions &&
      conn.versePositions.length === versePositions.length &&
      conn.versePositions.every((pos) => versePositions.includes(pos));
    
    const wordsMatch = (conn.word1 === pairing.term1 && conn.word2 === pairing.term2) ||
                      (conn.word1 === pairing.term2 && conn.word2 === pairing.term1);
    
    return wordsMatch && positionsMatch;
  });

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
      {showGraph && showCheckbox && onToggleGraph && (
        <label className='ml-2 flex items-center cursor-pointer' title={isInGraph ? 'Remove from graph' : 'Add to graph'}>
          <input
            type="checkbox"
            checked={isInGraph}
            onChange={() => {
              // Convert pairing to connection format expected by handleToggleGraph
              const connection = {
                word1: pairing.term1,
                word2: pairing.term2,
                reference: pairing.verses[0].reference,
                versePositions: pairing.verses.map(v => v.position),
              };
              onToggleGraph(connection);
            }}
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
}