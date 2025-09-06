'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { kjvParser, VersePairing } from '../lib';
import { TabBar } from '../lib/tab-bar';
import { TabManager, TabManagerService } from '../lib/tab-manager';
import { GraphVisualizer } from '../lib/graph-visualizer';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { ToggleButton } from '../components/ui/toggle-button';
import { SearchInput } from '../components/search/search-input';
import { FilterControls } from '../components/search/filter-controls';
import { SearchResults } from '../components/search/search-results';
import { useSearchState } from '../hooks/use-search-state';
import { useTabStatePersistence } from '../hooks/use-tab-state-persistence';
import { testLocalStorage, getLocalStorageInfo } from '../lib/storage-test';
import { DevStorageHelper } from '../lib/dev-storage-helper';
import { MoonStarIcon, SunIcon, WorkflowIcon } from 'lucide-react';
import {
  getBackgroundClass,
  getTextClass,
  getBorderClass,
} from '../lib/theme-utils';
import { APP_CONFIG } from '../lib/constants';

export default function Home() {
  // Tab management
  const [tabManager, setTabManager] = useState<TabManager>(() => {
    // Try to restore from dev backup first
    if (process.env.NODE_ENV === 'development') {
      DevStorageHelper.restoreFromBackup();
    }
    return TabManagerService.loadTabManager();
  });

  // Search state
  const {
    searchTerms,
    setSearchTerms,
    pairingsSearchTerms,
    setPairingsSearchTerms,
    debouncedSearchTerms,
    debouncedPairingsSearchTerms,
    results,
    pairings,
    error,
    selectedTestament,
    setSelectedTestament,
    selectedBooks,
    setSelectedBooks,
    filterCounts,
    performSearch,
  } = useSearchState();

  // UI state - Initialize with default values, will be updated in useEffect
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [containerHeight, setContainerHeight] = useState(400);
  const [activeTab, setActiveTab] = useState<'all' | 'pairings'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [selectedConnections, setSelectedConnections] = useState<
    Array<{
      word1: string;
      word2: string;
      reference: string;
      versePositions: number[];
    }>
  >([]);

  // Generate unique localStorage key for scroll position
  const scrollPositionKey = useMemo(() => {
    return `kjv-scroll-${tabManager.activeTabId}-${activeTab}`;
  }, [tabManager.activeTabId, activeTab]);

  // Handle client-side hydration and load tab state
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);

      // Test localStorage functionality

      testLocalStorage();
      getLocalStorageInfo();

      // Start dev backup in development mode
      if (process.env.NODE_ENV === 'development') {
        DevStorageHelper.startDevBackup();
      }

      const currentTabState = TabManagerService.getActiveTab(tabManager);
      if (currentTabState) {
        // Load all tab state on mount
        setSearchTerms(currentTabState.searchTerms);
        setPairingsSearchTerms(currentTabState.pairingsSearchTerms);
        setSelectedTestament(currentTabState.selectedTestament);
        setSelectedBooks(currentTabState.selectedBooks);
        setShowFilters(currentTabState.showFilters);
        setActiveTab(currentTabState.activeTab);
        setIsDarkMode(currentTabState.isDarkMode);
        setShowGraph(currentTabState.showGraph || false);
        const connections = currentTabState.selectedConnections || [];
        setSelectedConnections(
          connections.map((conn) => ({
            ...conn,
            versePositions: conn.versePositions || [],
          }))
        );
      }
    }
  }, [
    hasMounted,
    setPairingsSearchTerms,
    setSearchTerms,
    setSelectedBooks,
    setSelectedTestament,
    tabManager,
  ]);

  // Initialize KJV parser
  useEffect(() => {
    const initializeKJV = async () => {
      try {
        await kjvParser.fetchAndParse();

        setIsInitialized(true);
      } catch (err) {
        console.error('KJV initialization failed:', err);
        // Set initialized to true anyway to prevent infinite loading
        setIsInitialized(true);
      }
    };
    initializeKJV();
  }, []);

  // Set container height and handle resize
  useEffect(() => {
    const updateHeight = () => {
      setContainerHeight(
        window.innerHeight - APP_CONFIG.UI.CONTAINER_BASE_OFFSET
      );
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Perform search when dependencies change
  useEffect(() => {
    if (isInitialized) {
      performSearch(activeTab);
    }
  }, [
    debouncedSearchTerms,
    debouncedPairingsSearchTerms,
    activeTab,
    isInitialized,
    performSearch,
  ]);

  // Use the tab persistence hook
  useTabStatePersistence({
    tabManager,
    searchTerms,
    pairingsSearchTerms,
    selectedTestament,
    selectedBooks,
    showFilters,
    activeTab,
    isDarkMode,
    showGraph,
    selectedConnections,
    hasMounted,
  });

  // Handle tab manager changes
  const handleTabManagerChange = useCallback(
    (newTabManager: TabManager) => {
      const currentActiveTab = TabManagerService.getActiveTab(tabManager);
      const newActiveTab = TabManagerService.getActiveTab(newTabManager);

      // If switching to a different tab, save current state first
      if (
        currentActiveTab &&
        newActiveTab &&
        currentActiveTab.id !== newActiveTab.id
      ) {
        // Save current tab state before switching
        TabManagerService.updateTabState(tabManager, currentActiveTab.id, {
          searchTerms,
          pairingsSearchTerms,
          selectedTestament,
          selectedBooks,
          showFilters,
          activeTab,
          isDarkMode,
          showGraph,
          selectedConnections,
        });

        // Load new tab state
        setSearchTerms(newActiveTab.searchTerms);
        setPairingsSearchTerms(newActiveTab.pairingsSearchTerms);
        setSelectedTestament(newActiveTab.selectedTestament);
        setSelectedBooks(newActiveTab.selectedBooks);
        setShowFilters(newActiveTab.showFilters);
        setActiveTab(newActiveTab.activeTab);
        setIsDarkMode(newActiveTab.isDarkMode);
        setShowGraph(newActiveTab.showGraph || false);
        const connections = newActiveTab.selectedConnections;
        setSelectedConnections(Array.isArray(connections) ? connections : []);
      }

      setTabManager(newTabManager);
    },
    [
      tabManager,
      searchTerms,
      pairingsSearchTerms,
      selectedTestament,
      selectedBooks,
      showFilters,
      activeTab,
      isDarkMode,
      showGraph,
      selectedConnections,
      setSearchTerms,
      setPairingsSearchTerms,
      setSelectedTestament,
      setSelectedBooks,
    ]
  );

  // Stop dev backup on unmount
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV === 'development') {
        DevStorageHelper.stopDevBackup();
      }
    };
  }, []);

  // Event handlers
  const handleTestamentChange = (testament: 'all' | 'old' | 'new') => {
    setSelectedTestament(testament);
    setSelectedBooks([]); // Clear book selection when testament changes
  };

  const handleBookToggle = (book: string) => {
    setSelectedBooks((prev) => {
      if (prev.includes(book)) {
        return prev.filter((b) => b !== book);
      } else {
        return [...prev, book];
      }
    });
  };

  // Helper function to clean up orphaned nodes (nodes with no connections)
  const cleanupOrphanedNodes = useCallback(
    (connections: typeof selectedConnections) => {
      // Since the graph visualizer automatically creates nodes from connections,
      // orphaned nodes are automatically removed when their connections are removed.
      // This function is here for potential future enhancements.
      return connections;
    },
    []
  );

  const handleToggleGraph = useCallback(
    (pairing: VersePairing) => {
      console.log('handleToggleGraph called with pairing:', {
        term1: pairing.term1,
        term2: pairing.term2,
        allTermPairs: pairing.allTermPairs,
        hasAllTermPairs: !!pairing.allTermPairs,
        allTermPairsLength: pairing.allTermPairs?.length,
      });

      const connections = Array.isArray(selectedConnections)
        ? selectedConnections
        : [];
      const versePositions = pairing.verses.map((v) => v.position);
      const verseRef =
        pairing.verses.length === 1
          ? pairing.verses[0].reference
          : `${pairing.verses[0].reference} & ${pairing.verses[1].reference}`;

      // Get all term pairs - either from allTermPairs or create from term1/term2
      const termPairs =
        pairing.allTermPairs && pairing.allTermPairs.length > 0
          ? pairing.allTermPairs.map((pairStr) => {
              const [term1, term2] = pairStr.split(' ↔ ');
              return { term1: term1.trim(), term2: term2.trim() };
            })
          : [{ term1: pairing.term1, term2: pairing.term2 }];

      console.log(
        'Processing pairing with',
        termPairs.length,
        'term pairs:',
        termPairs
      );

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
        // Remove all term pairs from graph (orphaned nodes will be automatically cleaned up)
        setSelectedConnections((prev) => {
          const prevArray = Array.isArray(prev) ? prev : [];
          const filteredConnections = prevArray.filter((conn) => {
            const positionsMatch =
              conn.versePositions &&
              conn.versePositions.length === versePositions.length &&
              conn.versePositions.every((pos: number) =>
                versePositions.includes(pos)
              );

            if (!positionsMatch) return true; // Keep connections with different verses

            // Remove if this connection matches any of the term pairs
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
        // Add all term pairs to graph (skip existing ones)
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

            // Debug: log what's being filtered
            if (exists) {
              console.log(`Skipping existing connection: ${term1} ↔ ${term2}`);
            } else {
              console.log(`Adding new connection: ${term1} ↔ ${term2}`);
            }

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

  const handleSelectAllPairings = useCallback(() => {
    if (activeTab !== 'pairings') return;

    // Create a Set of existing connection keys for fast lookup (normalized)
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

    // Build new connections array, handling both single and consolidated pairings
    const newConnections: typeof selectedConnections = [];

    pairings.forEach((pairing) => {
      const versePositions = pairing.verses.map((v) => v.position);
      const verseRef =
        pairing.verses.length === 1
          ? pairing.verses[0].reference
          : `${pairing.verses[0].reference} & ${pairing.verses[1].reference}`;

      if (pairing.allTermPairs && pairing.allTermPairs.length > 1) {
        // Handle consolidated pairings - add all term pairs
        pairing.allTermPairs.forEach((pairStr) => {
          const [term1, term2] = pairStr.split(' ↔ ').map((t) => t.trim());
          const sortedPositions = versePositions
            .slice()
            .sort((a, b) => a - b)
            .join(',');
          const [word1, word2] = [term1, term2].sort();
          const key = `${word1}-${word2}-${sortedPositions}`;

          // Skip if already exists
          if (!existingKeys.has(key)) {
            newConnections.push({
              word1: term1,
              word2: term2,
              reference: verseRef,
              versePositions: versePositions,
            });
            existingKeys.add(key); // Prevent duplicates within this operation
          }
        });
      } else {
        // Handle single pairing
        const sortedPositions = versePositions
          .slice()
          .sort((a, b) => a - b)
          .join(',');
        const [word1, word2] = [pairing.term1, pairing.term2].sort();
        const key = `${word1}-${word2}-${sortedPositions}`;

        // Skip if already exists
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
  }, [activeTab, pairings, selectedConnections]);

  const handleDeselectAllPairings = useCallback(() => {
    if (activeTab !== 'pairings') return;

    // Create a Set of current pairing keys for fast lookup (normalized word order)
    const currentPairingKeys = new Set(
      pairings.flatMap((pairing) => {
        if (pairing.allTermPairs && pairing.allTermPairs.length > 1) {
          // Handle consolidated pairings - create keys for all term pairs
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
          // Handle single pairing
          const versePositions = pairing.verses
            .map((v) => v.position)
            .sort((a, b) => a - b)
            .join(',');
          const [word1, word2] = [pairing.term1, pairing.term2].sort();
          return [`${word1}-${word2}-${versePositions}`];
        }
      })
    );

    // Filter out matching connections in one pass (orphaned nodes automatically cleaned up)
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
  }, [activeTab, pairings, cleanupOrphanedNodes]);

  // Calculate if all current pairings are selected (optimized with normalized keys)
  const allPairingsSelected = useMemo(() => {
    if (activeTab !== 'pairings' || pairings.length === 0) return false;

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
  }, [activeTab, pairings, selectedConnections]);

  // Loading state
  if (!isInitialized || !hasMounted) {
    return (
      <LoadingSpinner message='Loading KJV text...' isDarkMode={isDarkMode} />
    );
  }

  return (
    <div
      className={`h-screen overflow-hidden ${getBackgroundClass(isDarkMode)}`}
    >
      <TabBar
        tabManager={tabManager}
        onTabManagerChange={handleTabManagerChange}
        isDarkMode={isDarkMode}
      />

      <div
        className={`max-w-6xl mx-auto px-2 flex flex-col`}
        style={{ height: 'calc(100vh - 40px)' }}
      >
        {/* Header */}
        <div
          className={`rounded-lg shadow-md mb-2 p-1.5 ${getBackgroundClass(
            isDarkMode,
            'card'
          )}`}
        >
          <div className='flex justify-between items-center mb-1'>
            <h1 className={`text-base font-bold ${getTextClass(isDarkMode)}`}>
              KJV Bible Search
            </h1>
            <div className='flex gap-0 rounded-sm overflow-clip'>
              <ToggleButton
                isActive={showGraph}
                onClick={() => setShowGraph(!showGraph)}
                activeIcon={WorkflowIcon}
                inactiveIcon={WorkflowIcon}
                title={
                  showGraph ? 'Hide graph visualizer' : 'Show graph visualizer'
                }
                isDarkMode={isDarkMode}
              />

              <ToggleButton
                isActive={isDarkMode}
                onClick={() => setIsDarkMode(!isDarkMode)}
                activeIcon={SunIcon}
                inactiveIcon={MoonStarIcon}
                title={
                  isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
                }
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Search Inputs */}
          <SearchInput
            value={searchTerms}
            onChange={setSearchTerms}
            placeholder='Start typing to search... (min 2 characters)'
            label='Enter search words (separated by spaces):'
            isDarkMode={isDarkMode}
          />

          {activeTab === 'pairings' && (
            <SearchInput
              value={pairingsSearchTerms}
              onChange={setPairingsSearchTerms}
              placeholder='Enter second group of words...'
              label='Second search group (for pairings):'
              isDarkMode={isDarkMode}
              isPairingsInput={true}
            />
          )}

          {/* Filters */}
          <FilterControls
            selectedTestament={selectedTestament}
            selectedBooks={selectedBooks}
            showFilters={showFilters}
            filterCounts={filterCounts}
            isDarkMode={isDarkMode}
            onTestamentChange={handleTestamentChange}
            onBookToggle={handleBookToggle}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* Content Area */}
        <div className='flex-1 flex gap-2 min-h-0'>
          {/* Results Panel */}
          <div
            className={`flex-1 flex flex-col min-h-0 ${
              showGraph ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Tab Navigation */}
            <div className={`flex mb-2 gap-1 items-center justify-between`}>
              <div className='flex gap-1 items-center'>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'all'
                      ? `${getBackgroundClass(
                          isDarkMode,
                          'secondary'
                        )} ${getTextClass(isDarkMode)} border-b-2 ${
                          isDarkMode ? 'border-blue-400' : 'border-blue-500'
                        }`
                      : `${getBackgroundClass(
                          isDarkMode,
                          'secondary'
                        )} ${getTextClass(
                          isDarkMode,
                          'muted'
                        )} hover:${getTextClass(isDarkMode, 'secondary')}`
                  }`}
                >
                  All Results ({results.length})
                </button>
                <button
                  onClick={() => setActiveTab('pairings')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'pairings'
                      ? `${getBackgroundClass(
                          isDarkMode,
                          'secondary'
                        )} ${getTextClass(isDarkMode)} border-b-2 ${
                          isDarkMode ? 'border-blue-400' : 'border-blue-500'
                        }`
                      : `${getBackgroundClass(
                          isDarkMode,
                          'secondary'
                        )} ${getTextClass(
                          isDarkMode,
                          'muted'
                        )} hover:${getTextClass(isDarkMode, 'secondary')}`
                  }`}
                >
                  Pairings ({pairings.length})
                </button>
              </div>

              {/* Select All Checkbox - Horizontally aligned with individual checkboxes */}
              {activeTab === 'pairings' && showGraph && pairings.length > 0 && (
                <label
                  className='mr-2 flex items-center cursor-pointer'
                  title={
                    allPairingsSelected
                      ? 'Deselect all pairings'
                      : 'Select all pairings'
                  }
                >
                  <input
                    type='checkbox'
                    checked={allPairingsSelected}
                    onChange={() => {
                      if (allPairingsSelected) {
                        handleDeselectAllPairings();
                      } else {
                        handleSelectAllPairings();
                      }
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

            {/* Search Results */}
            <div className='flex-1 min-h-0'>
              {error ? (
                <div
                  className={`flex items-center justify-center h-full ${getTextClass(
                    isDarkMode,
                    'error'
                  )}`}
                >
                  <p className='text-sm'>{error}</p>
                </div>
              ) : (
                <SearchResults
                  results={results}
                  pairings={pairings}
                  activeTab={activeTab}
                  searchTerms={searchTerms}
                  pairingsSearchTerms={pairingsSearchTerms}
                  containerHeight={containerHeight}
                  isDarkMode={isDarkMode}
                  scrollPositionKey={scrollPositionKey}
                  showGraph={showGraph}
                  selectedConnections={selectedConnections}
                  onToggleGraph={handleToggleGraph}
                />
              )}
            </div>
          </div>

          {/* Graph Panel */}
          {showGraph && (
            <div
              className={`w-1/2 rounded-lg shadow-md flex flex-col min-h-0 ${getBackgroundClass(
                isDarkMode,
                'card'
              )}`}
            >
              <div
                className={`p-2 border-b flex-shrink-0 ${getBorderClass(
                  isDarkMode
                )}`}
              >
                <div className='flex justify-between items-center'>
                  <h3
                    className={`text-sm font-medium ${getTextClass(
                      isDarkMode
                    )}`}
                  >
                    Word Connections Graph
                  </h3>
                  <button
                    onClick={() => setSelectedConnections([])}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className='flex-1 min-h-0'>
                <GraphVisualizer connections={selectedConnections} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
