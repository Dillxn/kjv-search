import { useState, useCallback, useMemo, useEffect } from 'react';
import { VersePairing } from '../lib';

interface GraphConnection {
  word1: string;
  word2: string;
  reference: string;
  versePositions: number[];
}

export function useGraphState() {
  const [selectedConnections, setSelectedConnections] = useState<GraphConnection[]>([]);

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

      // Get all term pairs
      const termPairs =
        pairing.allTermPairs && pairing.allTermPairs.length > 0
          ? pairing.allTermPairs.map((pairStr) => {
              const [term1, term2] = pairStr.split(' ↔ ');
              return { term1: term1.trim(), term2: term2.trim() };
            })
          : [{ term1: pairing.term1, term2: pairing.term2 }];

      // Check if ALL term pairs are already in the graph
      const allExist = termPairs.every(({ term1, term2 }) => {
        return connections.some((conn) => {
          const positionsMatch =
            conn.versePositions &&
            conn.versePositions.length === versePositions.length &&
            conn.versePositions.every((pos: number) =>
              versePositions.includes(pos)
            );

          const wordsMatch =
            (conn.word1 === term1 && conn.word2 === term2) ||
            (conn.word1 === term2 && conn.word2 === term1);

          return wordsMatch && positionsMatch;
        });
      });

      if (allExist) {
        // Remove all term pairs from graph
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

            return !termPairs.some(({ term1, term2 }) => {
              return (
                (conn.word1 === term1 && conn.word2 === term2) ||
                (conn.word1 === term2 && conn.word2 === term1)
              );
            });
          });
          return cleanupOrphanedNodes(filteredConnections);
        });
      } else {
        // Add all term pairs to graph
        const newConnections = termPairs
          .filter(({ term1, term2 }) => {
            const exists = connections.some((conn) => {
              const positionsMatch =
                conn.versePositions &&
                conn.versePositions.length === versePositions.length &&
                conn.versePositions.every((pos: number) =>
                  versePositions.includes(pos)
                );

              const wordsMatch =
                (conn.word1 === term1 && conn.word2 === term2) ||
                (conn.word1 === term2 && conn.word2 === term1);

              return wordsMatch && positionsMatch;
            });

            return !exists;
          })
          .map(({ term1, term2 }) => ({
            word1: term1,
            word2: term2,
            reference: verseRef,
            versePositions: versePositions,
          }));

        if (newConnections.length > 0) {
          setSelectedConnections((prev) => {
            const prevArray = Array.isArray(prev) ? prev : [];
            return cleanupOrphanedNodes([...prevArray, ...newConnections]);
          });
        }
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

        if (pairing.allTermPairs && pairing.allTermPairs.length > 1) {
          pairing.allTermPairs.forEach((pairStr) => {
            const [term1, term2] = pairStr.split(' ↔ ').map((t) => t.trim());
            const sortedPositions = versePositions
              .slice()
              .sort((a, b) => a - b)
              .join(',');
            const [word1, word2] = [term1, term2].sort();
            const key = `${word1}-${word2}-${sortedPositions}`;

            if (!existingKeys.has(key)) {
              newConnections.push({
                word1: term1,
                word2: term2,
                reference: verseRef,
                versePositions: versePositions,
              });
              existingKeys.add(key);
            }
          });
        } else {
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
        pairings.flatMap((pairing) => {
          if (pairing.allTermPairs && pairing.allTermPairs.length > 1) {
            const versePositions = pairing.verses
              .map((v) => v.position)
              .sort((a, b) => a - b)
              .join(',');
            return pairing.allTermPairs.map((pairStr) => {
              const [term1, term2] = pairStr.split(' ↔ ').map((t) => t.trim());
              const [word1, word2] = [term1, term2].sort();
              return `${word1}-${word2}-${versePositions}`;
            });
          } else {
            const versePositions = pairing.verses
              .map((v) => v.position)
              .sort((a, b) => a - b)
              .join(',');
            const [word1, word2] = [pairing.term1, pairing.term2].sort();
            return [`${word1}-${word2}-${versePositions}`];
          }
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
      // If no pairings, keep all connections (they might be from other search terms)
      return;
    }

    const validConnectionKeys = new Set<string>();
    
    currentPairings.forEach((pairing) => {
      const versePositions = pairing.verses
        .map((v) => v.position)
        .sort((a, b) => a - b)
        .join(',');
      
      if (pairing.allTermPairs && pairing.allTermPairs.length > 1) {
        pairing.allTermPairs.forEach((pairStr) => {
          const [term1, term2] = pairStr.split(' ↔ ').map((t) => t.trim());
          const [word1, word2] = [term1, term2].sort();
          validConnectionKeys.add(`${word1}-${word2}-${versePositions}`);
        });
      } else {
        const [word1, word2] = [pairing.term1, pairing.term2].sort();
        validConnectionKeys.add(`${word1}-${word2}-${versePositions}`);
      }
    });

    setSelectedConnections((prev) => {
      const prevArray = Array.isArray(prev) ? prev : [];
      const filteredConnections = prevArray.filter((conn) => {
        const versePositions = conn.versePositions
          ?.slice()
          .sort((a, b) => a - b)
          .join(',') || '';
        const [word1, word2] = [conn.word1, conn.word2].sort();
        const key = `${word1}-${word2}-${versePositions}`;
        return validConnectionKeys.has(key);
      });
      
      // Only update if there's actually a change
      if (filteredConnections.length !== prevArray.length) {
        return cleanupOrphanedNodes(filteredConnections);
      }
      return prevArray;
    });
  }, [cleanupOrphanedNodes]);

  return {
    selectedConnections,
    setSelectedConnections,
    handleToggleGraph,
    handleSelectAllPairings,
    handleDeselectAllPairings,
    allPairingsSelected,
    cleanupInvalidConnections,
  };
}