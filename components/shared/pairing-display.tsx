'use client';

import { VersePairing } from '../../lib/kjv-parser';
import { UnifiedHighlighter } from '../../lib/highlighting';
import { SearchResultsHelper } from '../../lib/search-utils';
import { RegexUtils } from '../../lib/shared/regex-utils';
import { MatchBounds } from '../../lib/types/verse';
import { CardinalityToggle, CardinalityType } from '../ui/cardinality-toggle';
import { VerseContextTooltip } from './verse-context-tooltip';
import { convertPairingToConnection, getConnectionKey } from '../../lib/graph/connection-utils';

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
  onUpdateCardinality?: (connectionKey: string, cardinality: CardinalityType) => void;
  connectionCardinalities?: Record<string, CardinalityType>;
  showCardinalityToggle?: boolean;
}

export function PairingDisplay({
  pairing,
  searchTerms = '',
  pairingsSearchTerms = '',
  isDarkMode,
  showGraph = false,
  selectedConnections = [],
  onToggleGraph,
  onUpdateCardinality,
  connectionCardinalities = {},
  showCardinalityToggle = true,
}: PairingDisplayProps) {


  // Function to highlight text with only the terms that contributed to this pairing result
  const highlightPairingText = (text: string): string => {
    // Find matches only for the specific pairing terms
    const pairingMatches: MatchBounds[] = [];

    // Find matches for term1
    const term1Matches = RegexUtils.findMatches(text, pairing.term1);
    for (const match of term1Matches) {
      pairingMatches.push({
        term: pairing.term1,
        start: match.start,
        end: match.end,
      });
    }

    // Find matches for term2
    const term2Matches = RegexUtils.findMatches(text, pairing.term2);
    for (const match of term2Matches) {
      pairingMatches.push({
        term: pairing.term2,
        start: match.start,
        end: match.end,
      });
    }

    // Use full search term lists for consistent color assignment with search input
    const allSearchTerms = SearchResultsHelper.processSearchString(searchTerms || '');
    const allPairingsTerms: string[] = [];

    return UnifiedHighlighter.highlightText(text, {
      matches: pairingMatches,
      mainTerms: allSearchTerms,
      pairingsTerms: allPairingsTerms,
      isDarkMode,
      usePairingsColors: allPairingsTerms.length > 0,
      maintainInputOrder: true,
    });
  };

  const connectionInfo = convertPairingToConnection(pairing);
  const connectionKey = getConnectionKey(pairing);
  const currentCardinality = connectionCardinalities[connectionKey] || null;

  const isInGraph =
    Array.isArray(selectedConnections) &&
    selectedConnections.some((conn) => {
      if (!conn?.versePositions) {
        return false;
      }

      const positionsMatch =
        conn.versePositions.length === connectionInfo.versePositions.length &&
        conn.versePositions.every((pos) => connectionInfo.versePositions.includes(pos));

      if (!positionsMatch) {
        return false;
      }

      const connectionKeyFromSelection = `${conn.word1}-${conn.word2}-${conn.reference}`;
      return connectionKeyFromSelection === connectionKey;
    });


  return (
    <div
      key={`${pairing.term1}-${pairing.term2}-${pairing.verses
        .map((v) => v.position)
        .join('-')}`}
      className={`border-l-2 flex justify-between items-center pl-2 py-1 mb-1 ${
        isDarkMode ? 'border-green-400' : 'border-green-500'
      }`}
    >
      <div className='flex-1'>
        
        {pairing.verses.map((verse, verseIndex) => (
          <VerseContextTooltip
            key={verse.position}
            verse={verse}
            isDarkMode={isDarkMode}
            contextBefore={1}
            contextAfter={1}
          >
            <div className={verseIndex > 0 ? 'mt-1' : ''}>
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
          </VerseContextTooltip>
        ))}
      </div>
      {showGraph && showCardinalityToggle && onToggleGraph && onUpdateCardinality && (
        <div className='ml-2'>
          <CardinalityToggle
            value={currentCardinality}
            onChange={(cardinality) => onUpdateCardinality(connectionKey, cardinality)}
            isDarkMode={isDarkMode}
            isInGraph={isInGraph}
            onToggleGraph={() => {
              // Convert pairing to connection format expected by handleToggleGraph
              onToggleGraph(connectionInfo);
            }}
          />
        </div>
      )}
    </div>
  );
}
