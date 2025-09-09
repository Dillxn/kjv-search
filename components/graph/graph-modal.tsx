'use client';

import { kjvParser, VersePairing } from '../../lib';
import { PairingDisplay } from '../shared/pairing-display';

interface GraphModalProps {
  selectedEdge: {
    edge: {
      source: string;
      target: string;
      reference: string;
      versePositions?: number[];
    };
    connection: {
      word1: string;
      word2: string;
      reference: string;
      versePositions?: number[];
    };
    allConnections?: Array<{
      word1: string;
      word2: string;
      reference: string;
      versePositions?: number[];
    }>;
  };
  connections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
  onClose: () => void;
}

export function GraphModal({
  selectedEdge,
  connections,
  onClose,
}: GraphModalProps) {
  // Get current connections for this word pair (real-time)
  const currentConnections = connections
    .filter(
      (conn) =>
        (conn.word1 === selectedEdge.edge.source &&
          conn.word2 === selectedEdge.edge.target) ||
        (conn.word1 === selectedEdge.edge.target &&
          conn.word2 === selectedEdge.edge.source)
    )
    .sort((a, b) => {
      // Calculate proximity for each connection
      const proximityA =
        a.versePositions && a.versePositions.length > 1
          ? Math.abs(a.versePositions[0] - a.versePositions[1])
          : 0;
      const proximityB =
        b.versePositions && b.versePositions.length > 1
          ? Math.abs(b.versePositions[0] - b.versePositions[1])
          : 0;

      // Sort by proximity first (same verse = 0, then 1, 2, etc.)
      if (proximityA !== proximityB) {
        return proximityA - proximityB;
      }

      // If proximity is the same, sort by first verse position
      const firstPosA = a.versePositions?.[0] || 0;
      const firstPosB = b.versePositions?.[0] || 0;
      return firstPosA - firstPosB;
    });

  const allVerses = kjvParser.getVerses();

  return (
    <div className='w-full h-full flex flex-col bg-white'>
      {/* Header */}
      <div className='px-3 py-2 border-b bg-white shadow-sm flex justify-between items-center flex-shrink-0'>
        <h3 className='text-sm font-semibold text-gray-800'>
          {selectedEdge.edge.source} ↔ {selectedEdge.edge.target}
        </h3>
        <button
          onClick={onClose}
          className='text-gray-500 hover:text-gray-700 text-lg font-bold px-1 py-0.5 rounded hover:bg-gray-100'
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-4'>
        <div className='text-sm text-gray-600 mb-4'>
          {currentConnections.length > 0
            ? `Found ${currentConnections.length} connection(s) between these words`
            : 'No connections currently selected for these words'}
        </div>

        {currentConnections.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            <p>No verses currently selected for this word pair.</p>
            <p className='text-sm mt-2'>
              Add pairings from the search results to see verses here.
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {currentConnections.map((conn, index) => {
              const versePositions = conn.versePositions || [];
              const verseObjects = versePositions
                .map((pos) => allVerses.find((v) => v.position === pos))
                .filter(Boolean) as typeof allVerses;

              if (verseObjects.length === 0) return null;

              // Create a mock pairing for the shared component
              const proximity =
                versePositions.length > 1
                  ? Math.abs(versePositions[0] - versePositions[1])
                  : 0;

              const mockPairing: VersePairing = {
                verses: verseObjects,
                term1: conn.word1,
                term2: conn.word2,
                proximity,
              };

              return (
                <PairingDisplay
                  key={`${conn.word1}-${conn.word2}-${versePositions.join(
                    '-'
                  )}-${index}`}
                  pairing={mockPairing}
                  searchTerms={`${selectedEdge.edge.source} ${selectedEdge.edge.target}`}
                  isDarkMode={false}
                  showCardinalityToggle={false}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
