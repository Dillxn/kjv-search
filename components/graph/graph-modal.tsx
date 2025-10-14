'use client';

import { useMemo } from 'react';
import { kjvParser, VersePairing } from '../../lib';
import { PairingDisplay } from '../shared/pairing-display';
import { CardinalityType } from '../ui/cardinality-toggle';

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
  allConnections?: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions?: number[];
  }>;
  onClose: () => void;
  onToggleGraph?: (connection: {
    word1: string;
    word2: string;
    reference: string;
    versePositions: number[];
  }) => void;
  onUpdateCardinality?: (connectionKey: string, cardinality: CardinalityType) => void;
  connectionCardinalities?: Record<string, CardinalityType>;
  isDarkMode?: boolean;
  isEdgeChecked?: boolean;
  onEdgeCheckToggle?: (nextChecked: boolean) => void;
}

const createConnectionKey = (connection: {
  word1: string;
  word2: string;
  versePositions?: number[];
}) => {
  const positions = (connection.versePositions || []).slice().sort((a, b) => a - b).join(',');
  return `${connection.word1}|${connection.word2}|${positions}`;
};

export function GraphModal({
  selectedEdge,
  connections,
  allConnections = [],
  onClose,
  onToggleGraph,
  onUpdateCardinality,
  connectionCardinalities = {},
  isDarkMode = false,
  isEdgeChecked = false,
  onEdgeCheckToggle,
}: GraphModalProps) {
  const canEditCardinality = Boolean(onToggleGraph && onUpdateCardinality);

  const selectedConnectionKeys = useMemo(() => {
    return new Set(connections.map((conn) => createConnectionKey(conn)));
  }, [connections]);

  const edgeConnections = useMemo(() => {
    if (!selectedEdge) {
      return [];
    }

    if (selectedEdge.allConnections && selectedEdge.allConnections.length > 0) {
      return selectedEdge.allConnections;
    }

    const { source, target } = selectedEdge.edge;
    const matchEdge = (conn: { word1: string; word2: string }) =>
      (conn.word1 === source && conn.word2 === target) ||
      (conn.word1 === target && conn.word2 === source);

    if (allConnections.length > 0) {
      return allConnections.filter(matchEdge);
    }

    return connections.filter(matchEdge);
  }, [selectedEdge, allConnections, connections]);

  const connectionsWithMeta = useMemo(() => {
    return edgeConnections
      .map((conn) => {
        const key = createConnectionKey(conn);
        const versePositions = conn.versePositions || [];
        const proximity =
          versePositions.length > 1
            ? Math.abs(versePositions[0] - versePositions[1])
            : 0;

        return {
          connection: conn,
          isSelected: selectedConnectionKeys.has(key),
          proximity,
        };
      })
      .sort((a, b) => {
        if (a.isSelected !== b.isSelected) {
          return a.isSelected ? -1 : 1;
        }

        if (a.proximity !== b.proximity) {
          return a.proximity - b.proximity;
        }

        const firstPosA = a.connection.versePositions?.[0] || 0;
        const firstPosB = b.connection.versePositions?.[0] || 0;
        return firstPosA - firstPosB;
      });
  }, [edgeConnections, selectedConnectionKeys]);

  const totalConnections = connectionsWithMeta.length;
  const selectedCount = connectionsWithMeta.filter((item) => item.isSelected).length;
  const hasConnections = totalConnections > 0;
  const edgeHasSelectedConnections = connectionsWithMeta.some((item) => item.isSelected);
  const showEdgeCheckToggle = Boolean(onEdgeCheckToggle) && edgeHasSelectedConnections;
  const edgeToggleButtonClass = isEdgeChecked
    ? (isDarkMode
        ? 'bg-blue-600 text-white hover:bg-blue-500 border border-blue-500'
        : 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-600')
    : (isDarkMode
        ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-600'
        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300');
  const edgeToggleLabel = isEdgeChecked ? '✓' : '✓';

  const allVerses = kjvParser.getVerses();

  return (
    <div
      className={`w-full h-full flex flex-col ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 py-2 border-b shadow-sm flex justify-between items-center flex-shrink-0 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <h3
          className={`text-sm font-semibold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-800'
          }`}
        >
          {selectedEdge.edge.source} ↔ {selectedEdge.edge.target}
        </h3>
        <div className='flex items-center gap-2'>
          {showEdgeCheckToggle && (
            <button
              type='button'
              onClick={() => onEdgeCheckToggle?.(!isEdgeChecked)}
              className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${edgeToggleButtonClass}`}
            >
              {edgeToggleLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className={`text-lg font-bold px-1 py-0.5 rounded ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        <div
          className={`text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          {hasConnections
            ? `Selected ${selectedCount} of ${totalConnections} connection${totalConnections === 1 ? '' : 's'} between these words`
            : 'No connections found between these words'}
        </div>

        {!hasConnections ? (
          <div
            className={`text-center py-8 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <p>No verses available for this word pair yet.</p>
            <p className='text-sm mt-2'>
              Try adding pairings from the search results to explore potential connections.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {connectionsWithMeta.map(({ connection: conn, isSelected }, index) => {
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
                <div
                  key={`${conn.word1}-${conn.word2}-${versePositions.join('-')}-${index}`}
                  className={`rounded-md border shadow-sm p-3 ${
                    isSelected
                      ? (isDarkMode
                          ? 'bg-gray-800 border-green-500/60'
                          : 'bg-white border-green-300')
                      : (isDarkMode
                          ? 'bg-gray-900 border-gray-700 border-dashed'
                          : 'bg-gray-50 border-gray-300 border-dashed')
                  }`}
                >
                  {!isSelected && (
                    <div
                      className={`text-[10px] uppercase tracking-wide font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      Not in graph
                    </div>
                  )}
                  <PairingDisplay
                    pairing={mockPairing}
                    searchTerms={`${selectedEdge.edge.source} ${selectedEdge.edge.target}`}
                    isDarkMode={isDarkMode}
                    showGraph={canEditCardinality}
                    selectedConnections={connections}
                    onToggleGraph={onToggleGraph}
                    onUpdateCardinality={onUpdateCardinality}
                    connectionCardinalities={connectionCardinalities}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
