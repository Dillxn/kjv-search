'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { kjvParser, VersePairing } from '../lib';
import { TabBar } from '../lib/tab-bar';
import { GraphVisualizer } from '../lib/graph-visualizer';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { AppHeader } from '../components/ui/app-header';
import { TabNavigation } from '../components/ui/tab-navigation';
import { SearchResults } from '../components/search/search-results';

import { useTabReducer } from '../hooks/use-tab-reducer';
import { testLocalStorage, getLocalStorageInfo } from '../lib/storage-test';
import { DevStorageHelper } from '../lib/dev-storage-helper';

import {
  getBackgroundClass,
  getTextClass,
} from '../lib/theme-utils';

// Type for graph connections
type GraphConnection = {
  word1: string;
  word2: string;
  reference: string;
  versePositions: number[];
};

export default function Home() {
  // All state managed by atomic reducer
  const { state, activeTab, actions, performSearch } = useTabReducer();
  
  // UI state
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Generate unique localStorage key for scroll position
  const scrollPositionKey = useMemo(() => {
    return `kjv-scroll-${state.activeTabId}-${activeTab.activeTab}`;
  }, [state.activeTabId, activeTab.activeTab]);

  // Handle client-side hydration
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);

      testLocalStorage();
      getLocalStorageInfo();

      if (process.env.NODE_ENV === 'development') {
        DevStorageHelper.startDevBackup();
      }
    }
  }, [hasMounted]);

  // Initialize KJV parser
  useEffect(() => {
    const initializeKJV = async () => {
      try {
        await kjvParser.fetchAndParse();
        setIsInitialized(true);
      } catch (err) {
        console.error('KJV initialization failed:', err);
        setIsInitialized(true);
      }
    };
    initializeKJV();
  }, []);

  // Perform search when tab state changes and KJV is initialized
  useEffect(() => {
    if (isInitialized && hasMounted && state.isInitialized) {
      performSearch(); // Uses debouncing internally
    }
  }, [
    activeTab.searchTerms,
    activeTab.pairingsSearchTerms,
    activeTab.activeTab,
    activeTab.selectedTestament,
    activeTab.selectedBooks,
    activeTab.maxProximity,
    isInitialized,
    hasMounted,
    state.isInitialized,
    performSearch, // Keep this but make performSearch stable
  ]);

  // Perform immediate search when switching tabs
  useEffect(() => {
    if (isInitialized && hasMounted && state.isInitialized) {
      performSearch(undefined, true); // Immediate search for tab switches
    }
  }, [state.activeTabId, isInitialized, hasMounted, state.isInitialized, performSearch]);

  // Tab action handlers
  const handleSwitchTab = useCallback((tabId: string) => {
    actions.switchTab(tabId);
  }, [actions]);

  const handleAddTab = useCallback(() => {
    actions.addTab();
  }, [actions]);

  const handleRemoveTab = useCallback((tabId: string) => {
    actions.removeTab(tabId);
  }, [actions]);

  const handleRenameTab = useCallback((tabId: string, name: string) => {
    actions.renameTab(tabId, name);
  }, [actions]);

  const handleDuplicateTab = useCallback((tabId: string) => {
    actions.duplicateTab(tabId);
  }, [actions]);

  // Stop dev backup on unmount
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV === 'development') {
        DevStorageHelper.stopDevBackup();
      }
    };
  }, []);

  // Event handlers
  const handleTestamentChange = useCallback((testament: 'all' | 'old' | 'new') => {
    actions.updateFilters(testament, [], activeTab.maxProximity);
  }, [actions, activeTab.maxProximity]);

  const handleBookToggle = useCallback((book: string) => {
    const newBooks = activeTab.selectedBooks.includes(book)
      ? activeTab.selectedBooks.filter(b => b !== book)
      : [...activeTab.selectedBooks, book];
    actions.updateFilters(activeTab.selectedTestament, newBooks, activeTab.maxProximity);
  }, [actions, activeTab.selectedBooks, activeTab.selectedTestament, activeTab.maxProximity]);

  // Graph event handlers
  const handleToggleGraph = useCallback((connection: GraphConnection) => {
    const versePositions = connection.versePositions || [];
    const sortedPositions = versePositions
      .slice()
      .sort((a: number, b: number) => a - b)
      .join(',');
    const [word1, word2] = [connection.word1, connection.word2].sort();
    const connectionKey = `${word1}-${word2}-${sortedPositions}`;

    const exists = activeTab.selectedConnections.some(conn => {
      const connVersePositions = conn.versePositions || [];
      const connSortedPositions = connVersePositions
        .slice()
        .sort((a, b) => a - b)
        .join(',');
      const [connWord1, connWord2] = [conn.word1, conn.word2].sort();
      const connKey = `${connWord1}-${connWord2}-${connSortedPositions}`;
      return connKey === connectionKey;
    });
    
    const newConnections = exists
      ? activeTab.selectedConnections.filter(conn => {
          const connVersePositions = conn.versePositions || [];
          const connSortedPositions = connVersePositions
            .slice()
            .sort((a, b) => a - b)
            .join(',');
          const [connWord1, connWord2] = [conn.word1, conn.word2].sort();
          const connKey = `${connWord1}-${connWord2}-${connSortedPositions}`;
          return connKey !== connectionKey;
        })
      : [...activeTab.selectedConnections, connection];
    
    actions.updateGraphState({ selectedConnections: newConnections });
  }, [actions, activeTab.selectedConnections]);

  const handleSelectAllPairings = useCallback((pairings: VersePairing[]) => {
    const existingConnections = activeTab.selectedConnections;
    const existingKeys = new Set(
      existingConnections.map((conn) => {
        const versePositions = conn.versePositions
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
      const verseRef = pairing.verses.length === 1
        ? pairing.verses[0].reference
        : `${pairing.verses[0].reference} & ${pairing.verses[1].reference}`;

      const sortedPositions = versePositions
        .slice()
        .sort((a: number, b: number) => a - b)
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
      actions.updateGraphState({ 
        selectedConnections: [...existingConnections, ...newConnections] 
      });
    }
  }, [actions, activeTab.selectedConnections]);

  const handleDeselectAllPairings = useCallback(() => {
    actions.updateGraphState({ selectedConnections: [] });
  }, [actions]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const newNodes = activeTab.selectedNodes.includes(nodeId)
      ? activeTab.selectedNodes.filter(id => id !== nodeId)
      : [...activeTab.selectedNodes, nodeId];
    actions.updateGraphState({ selectedNodes: newNodes });
  }, [actions, activeTab.selectedNodes]);

  const clearNodeSelection = useCallback(() => {
    actions.updateGraphState({ selectedNodes: [] });
  }, [actions]);

  const handleGraphTransformChange = useCallback((newTransform: { x: number; y: number; scale: number }) => {
    actions.updateGraphState({ graphTransform: newTransform });
  }, [actions]);

  // Computed values
  const allPairingsSelected = useCallback((pairings: VersePairing[]) => {
    if (pairings.length === 0) return false;

    const connectionKeys = new Set(
      activeTab.selectedConnections.map((conn) => {
        const versePositions = conn.versePositions
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
        .sort((a: number, b: number) => a - b)
        .join(',');
      const [word1, word2] = [pairing.term1, pairing.term2].sort();
      const key = `${word1}-${word2}-${versePositions}`;
      return connectionKeys.has(key);
    });
  }, [activeTab.selectedConnections]);

  // Use filter counts from active tab
  const filterCounts = activeTab.filterCounts;

  // Loading state
  if (!isInitialized || !hasMounted || !state.isInitialized) {
    return (
      <LoadingSpinner message='Loading KJV text...' isDarkMode={activeTab?.isDarkMode || false} />
    );
  }

  return (
    <div
      className={`h-screen flex flex-col gap-2 p-2 overflow-hidden ${getBackgroundClass(
        activeTab.isDarkMode
      )}`}
    >
      <TabBar
        tabs={state.tabs}
        activeTabId={state.activeTabId}
        isDarkMode={activeTab.isDarkMode}
        onSwitchTab={handleSwitchTab}
        onAddTab={handleAddTab}
        onRemoveTab={handleRemoveTab}
        onRenameTab={handleRenameTab}
        onDuplicateTab={handleDuplicateTab}
      />

      <AppHeader
        isDarkMode={activeTab.isDarkMode}
        showGraph={activeTab.showGraph}
        searchTerms={activeTab.searchTerms}
        pairingsSearchTerms={activeTab.pairingsSearchTerms}
        activeTab={activeTab.activeTab}
        selectedTestament={activeTab.selectedTestament}
        selectedBooks={activeTab.selectedBooks}
        maxProximity={activeTab.maxProximity}
        showFilters={activeTab.showFilters}
        filterCounts={filterCounts}
        onDarkModeToggle={() => actions.updateUIState({ isDarkMode: !activeTab.isDarkMode })}
        onGraphToggle={() => actions.updateUIState({ showGraph: !activeTab.showGraph })}
        onSearchTermsChange={(terms) => actions.updateSearchTerms(terms, activeTab.pairingsSearchTerms)}
        onPairingsSearchTermsChange={(terms) => actions.updateSearchTerms(activeTab.searchTerms, terms)}
        onTestamentChange={handleTestamentChange}
        onBookToggle={handleBookToggle}
        onProximityChange={(proximity) => actions.updateFilters(activeTab.selectedTestament, activeTab.selectedBooks, proximity)}
        onToggleFilters={() => actions.updateUIState({ showFilters: !activeTab.showFilters })}
      />

      {/* Content Area */}
      <div className='flex-1 flex gap-2 min-h-0'>
          {/* Results Panel */}
          <div
            className={`flex-1 flex flex-col gap-2 min-h-0 ${
              activeTab.showGraph ? 'w-1/2' : 'w-full'
            }`}
          >
            <TabNavigation
              activeTab={activeTab.activeTab}
              resultsCount={activeTab.results.length}
              pairingsCount={activeTab.pairings.length}
              isDarkMode={activeTab.isDarkMode}
              showGraph={activeTab.showGraph}
              allPairingsSelected={allPairingsSelected(activeTab.pairings)}
              onTabChange={(tab) => actions.updateUIState({ activeTab: tab })}
              onSelectAllPairings={() => handleSelectAllPairings(activeTab.pairings)}
              onDeselectAllPairings={handleDeselectAllPairings}
            />

            {/* Search Results */}
            <div className='flex-1 min-h-0'>
              {activeTab.error ? (
                <div
                  className={`flex items-center justify-center h-full ${getTextClass(
                    activeTab.isDarkMode,
                    'error'
                  )}`}
                >
                  <p className='text-sm'>{activeTab.error}</p>
                </div>
              ) : (
                <SearchResults
                  results={activeTab.results}
                  pairings={activeTab.pairings}
                  activeTab={activeTab.activeTab}
                  searchTerms={activeTab.searchTerms}
                  pairingsSearchTerms={activeTab.pairingsSearchTerms}
                  isDarkMode={activeTab.isDarkMode}
                  scrollPositionKey={scrollPositionKey}
                  showGraph={activeTab.showGraph}
                  selectedConnections={activeTab.selectedConnections}
                  onToggleGraph={handleToggleGraph}
                />
              )}
            </div>
          </div>

          {/* Graph Panel */}
          {activeTab.showGraph && (
            <div
              className={`w-1/2 rounded-sm overflow-hidden shadow-md flex flex-col min-h-0 ${getBackgroundClass(
                activeTab.isDarkMode,
                'card'
              )}`}
            >
              <GraphVisualizer
                connections={activeTab.selectedConnections}
                searchTerms={activeTab.searchTerms}
                pairingsSearchTerms={activeTab.pairingsSearchTerms}
                isDarkMode={activeTab.isDarkMode}
                initialTransform={activeTab.graphTransform}
                onTransformChange={handleGraphTransformChange}
                selectedNodes={activeTab.selectedNodes}
                onNodeClick={handleNodeClick}
                onClearSelection={clearNodeSelection}
              />
            </div>
          )}
        </div>
    </div>
  );
}
