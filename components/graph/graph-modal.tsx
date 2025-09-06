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

export function GraphModal({ selectedEdge, connections, onClose }: GraphModalProps) {
  // Get current connections for this word pair (real-time)
  const currentConnections = connections.filter(conn => 
    (conn.word1 === selectedEdge.edge.source && conn.word2 === selectedEdge.edge.target) ||
    (conn.word1 === selectedEdge.edge.target && conn.word2 === selectedEdge.edge.source)
  );

  // Group connections by verse positions to create consolidated pairings
  const verseGroupMap = new Map<string, typeof currentConnections>();
  currentConnections.forEach(conn => {
    const verseKey = conn.versePositions?.slice().sort((a, b) => a - b).join(',') || '';
    if (!verseGroupMap.has(verseKey)) {
      verseGroupMap.set(verseKey, []);
    }
    verseGroupMap.get(verseKey)!.push(conn);
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
            <p className='text-sm mt-2'>Add pairings from the search results to see verses here.</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {Array.from(verseGroupMap.entries()).map(([verseKey, connections]) => {
              if (connections.length === 0) return null;
              
              const firstConn = connections[0];
              const versePositions = firstConn.versePositions || [];
              const verseObjects = versePositions
                .map(pos => allVerses.find(v => v.position === pos))
                .filter(Boolean) as typeof allVerses;
              
              if (verseObjects.length === 0) return null;

              // Create a mock pairing for the shared component
              const mockPairing: VersePairing = {
                verses: verseObjects,
                term1: connections[0].word1,
                term2: connections[0].word2,
                proximity: 0,
                // Add consolidated term pairs if multiple connections
                allTermPairs: connections.length > 1 
                  ? connections.map(conn => `${conn.word1} ↔ ${conn.word2}`)
                  : undefined,
              };

              return (
                <PairingDisplay
                  key={verseKey}
                  pairing={mockPairing}
                  searchTerms={`${selectedEdge.edge.source} ${selectedEdge.edge.target}`}
                  isDarkMode={false}
                  showCheckbox={false}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}