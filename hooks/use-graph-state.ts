import { useState, useCallback, useMemo } from 'react';
import { VersePairing } from '../lib';

interface GraphConnection {
  word1: string;
  word2: string;
  reference: string;
  versePositions: number[];
}

export function useGraphState() {
  const [selectedConnections, setSelectedConnections] = useState<GraphConnection[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  // Helper function to clean up orphaned nodes
  const cleanupOrphanedNodes = useCallback(
    (connections: GraphConnection[]) => {
      return connections;
    },
    []
  );

  const handleToggleGraph = useCallback(
    (pairing: VersePairing) => {
      const connections = Array.isArray(selectedConnections) ? selectedConnections : [];
      const versePositions = pairing.verses.map((v) => v.position);
      const verseRef =
        pairing.verses.length === 1
          ? pairing.verses[0].reference
          : `${pairing.verses[0].reference} & ${pairing.verses[1].reference}`;

      // Check if this pairing is already in the graph
      const exists = connections.some((conn) => {
        const positionsMatch =
          conn.versePositions &&
          conn.versePositions.length === versePositions.length &&
          conn.versePositions.every((pos: number) =>
            versePositions.includes(pos)
          );

        const wordsMatch =
          (conn.word1 === pairing.term1 && conn.word2 === pairing.term2) ||
          (conn.word1 === pairing.term2 && conn.word2 === pairing.term1);

        return wordsMatch && positionsMatch;
      });

      if (exists) {
        // Remove from graph
        setSelectedConnections((prev) => {
          const prevArray = Array.isArray(prev) ? prev : [];
          const filteredConnections = prevArray.filter((conn) => {
            const positionsMatch =
              conn.versePositions &&
              conn.versePositions.length === versePositions.length &&
              conn.versePositions.every((pos: number) =>
                versePositions.includes(pos)
              );

            if (!positionsMatch) return true;

            const wordsMatch =
              (conn.word1 === pairing.term1 && conn.word2 === pairing.term2) ||
              (conn.word1 === pairing.term2 && conn.word2 === pairing.term1);

            return !wordsMatch;
          });
          return cleanupOrphanedNodes(filteredConnections);
        });
      } else {
        // Add to graph
        const newConnection: GraphConnection = {
          word1: pairing.term1,
          word2: pairing.term2,
          reference: verseRef,
          versePositions: versePositions,
        };

        setSelectedConnections((prev) => {
          const prevArray = Array.isArray(prev) ? prev : [];
          return cleanupOrphanedNodes([...prevArray, newConnection]);
        });
      }
    },
    [selectedConnections, cleanupOrphanedNodes]
  );

  const handleSelectAllPairings = useCallback(
    (pairings: VersePairing[]) => {
      const existingConnections = Array.isArray(selectedConnections)
        ? selectedConnections
        : [];
      const existingKeys = new Set(
        existingConnections.map((conn) => {
          const versePositions =
            conn.versePositions
              ?.slice()
              .sort((a, b) => a - b)
              .join(',') || '';
          const [word1, word2] = [conn.word1, conn.word2].sort();
          return `${word1}-${word2}-${versePositions}`;
        })
      );

      const newConnections: GraphConnection[] = [];

      pairings.forEach((pairing) => {
        const versePositions = pairing.verses.map((v) => v.position);
        const verseRef =
          pairing.verses.length === 1
            ? pairing.verses[0].reference
            : `${pairing.verses[0].reference} & ${pairing.verses[1].reference}`;

        const sortedPositions = versePositions
          .slice()
          .sort((a, b) => a - b)
          .join(',');
        const [word1, word2] = [pairing.term1, pairing.term2].sort();
        const key = `${word1}-${word2}-${sortedPositions}`;

        if (!existingKeys.has(key)) {
          newConnections.push({
            word1: pairing.term1,
            word2: pairing.term2,
            reference: verseRef,
            versePositions: versePositions,
          });
        }
      });

      if (newConnections.length > 0) {
        setSelectedConnections((prev) => [
          ...(Array.isArray(prev) ? prev : []),
          ...newConnections,
        ]);
      }
    },
    [selectedConnections]
  );

  const handleDeselectAllPairings = useCallback(
    (pairings: VersePairing[]) => {
      const currentPairingKeys = new Set(
        pairings.map((pairing) => {
          const versePositions = pairing.verses
            .map((v) => v.position)
            .sort((a, b) => a - b)
            .join(',');
          const [word1, word2] = [pairing.term1, pairing.term2].sort();
          return `${word1}-${word2}-${versePositions}`;
        })
      );

      setSelectedConnections((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const filteredConnections = prevArray.filter((conn) => {
          const versePositions =
            conn.versePositions
              ?.slice()
              .sort((a, b) => a - b)
              .join(',') || '';
          const [word1, word2] = [conn.word1, conn.word2].sort();
          const key = `${word1}-${word2}-${versePositions}`;
          return !currentPairingKeys.has(key);
        });
        return cleanupOrphanedNodes(filteredConnections);
      });
    },
    [cleanupOrphanedNodes]
  );

  // Calculate if all current pairings are selected
  const allPairingsSelected = useMemo(() => {
    return (pairings: VersePairing[]) => {
      if (pairings.length === 0) return false;

      const connections = Array.isArray(selectedConnections)
        ? selectedConnections
        : [];
      const connectionKeys = new Set(
        connections.map((conn) => {
          const versePositions =
            conn.versePositions
              ?.slice()
              .sort((a, b) => a - b)
              .join(',') || '';
          const [word1, word2] = [conn.word1, conn.word2].sort();
          return `${word1}-${word2}-${versePositions}`;
        })
      );

      return pairings.every((pairing) => {
        const versePositions = pairing.verses
          .map((v) => v.position)
          .sort((a, b) => a - b)
          .join(',');
        const [word1, word2] = [pairing.term1, pairing.term2].sort();
        const key = `${word1}-${word2}-${versePositions}`;
        return connectionKeys.has(key);
      });
    };
  }, [selectedConnections]);

  // Function to clean up connections that are no longer valid based on current pairings
  const cleanupInvalidConnections = useCallback((currentPairings: VersePairing[]) => {
    if (currentPairings.length === 0) {
      // If no pairings, keep all connections (they might be from other search terms or other tabs)
      return;
    }

    const validConnectionKeys = new Set<string>();
    
    currentPairings.forEach((pairing) => {
      const versePositions = pairing.verses
        .map((v) => v.position)
        .sort((a, b) => a - b)
        .join(',');
      
      const [word1, word2] = [pairing.term1, pairing.term2].sort();
      validConnectionKeys.add(`${word1}-${word2}-${versePositions}`);
    });

    setSelectedConnections((prev) => {
      const prevArray = Array.isArray(prev) ? prev : [];
      
      // Only remove connections that match the current search terms but are no longer in results
      // This preserves connections from other searches/tabs
      const filteredConnections = prevArray.filter((conn) => {
        const versePositions = conn.versePositions
          ?.slice()
          .sort((a, b) => a - b)
          .join(',') || '';
        const [word1, word2] = [conn.word1, conn.word2].sort();
        const key = `${word1}-${word2}-${versePositions}`;
        
        // If this connection matches current search results, check if it's still valid
        if (validConnectionKeys.has(key)) {
          return true;
        }
        
        // If this connection doesn't match current search results, keep it
        // (it might be from a different search or tab)
        const matchesCurrentSearch = currentPairings.some(pairing => {
          const pairingWords = [pairing.term1, pairing.term2].sort();
          const connWords = [conn.word1, conn.word2].sort();
          return pairingWords[0] === connWords[0] && pairingWords[1] === connWords[1];
        });
        
        return !matchesCurrentSearch;
      });
      
      // Only update if there's actually a change
      if (filteredConnections.length !== prevArray.length) {
        return cleanupOrphanedNodes(filteredConnections);
      }
      return prevArray;
    });
  }, [cleanupOrphanedNodes]);

  // Node selection handlers
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodes(prev => {
      if (prev.includes(nodeId)) {
        // Deselect node
        return prev.filter(id => id !== nodeId);
      } else if (prev.length < 2) {
        // Select node (max 2 nodes)
        return [...prev, nodeId];
      } else {
        // Replace first selected node with new one
        return [prev[1], nodeId];
      }
    });
  }, []);

  const clearNodeSelection = useCallback(() => {
    setSelectedNodes([]);
  }, []);

  return {
    selectedConnections,
    setSelectedConnections,
    handleToggleGraph,
    handleSelectAllPairings,
    handleDeselectAllPairings,
    allPairingsSelected,
    cleanupInvalidConnections,
    selectedNodes,
    setSelectedNodes,
    handleNodeClick,
    clearNodeSelection,
  };
}