'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { kjvParser, VersePairing } from '../lib';
import { TabBar } from '../lib/tab-bar';
import { GraphVisualizer } from '../lib/graph-visualizer';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { AppHeader } from '../components/ui/app-header';
import { TabNavigation } from '../components/ui/tab-navigation';
import { SearchResults } from '../components/search/search-results';

import { useTabReducer, getSelectedConnections } from '../hooks/use-tab-reducer';
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

  // Create a memoized lookup map for faster connection index finding
  const connectionIndexMap = useMemo(() => {
    const allConnections = activeTab.activeTab === 'linking' 
      ? activeTab.linkings 
      : activeTab.pairings;
    
    const map = new Map<string, number>();
    allConnections.forEach((conn, index) => {
      const key = `${conn.term1}-${conn.term2}-${conn.verses[0].reference}`;
      map.set(key, index);
    });
    return map;
  }, [activeTab.activeTab, activeTab.linkings, activeTab.pairings]);

  // Graph event handlers
  const handleToggleGraph = useCallback((connection: GraphConnection) => {
    const currentGraphState = activeTab.activeTab === 'linking' 
      ? activeTab.linkingGraphState 
      : activeTab.pairingsGraphState;
    
    // Use the lookup map for O(1) index finding instead of O(n) findIndex
    const connectionKey = `${connection.word1}-${connection.word2}-${connection.reference}`;
    const connectionIndex = connectionIndexMap.get(connectionKey);
    
    if (connectionIndex === undefined) return; // Connection not found in current results
    
    const currentIndexes = currentGraphState.selectedConnectionIndexes;
    const exists = currentIndexes.includes(connectionIndex);
    
    const newIndexes = exists
      ? currentIndexes.filter(index => index !== connectionIndex)
      : [...currentIndexes, connectionIndex];
    
    const tabType = activeTab.activeTab === 'linking' ? 'linking' : 'pairings';
    actions.updateGraphState(tabType, { selectedConnectionIndexes: newIndexes });
  }, [actions, activeTab.activeTab, activeTab.pairingsGraphState, activeTab.linkingGraphState, connectionIndexMap]);

  const handleSelectAllPairings = useCallback((pairings: VersePairing[]) => {
    const currentGraphState = activeTab.activeTab === 'linking' 
      ? activeTab.linkingGraphState 
      : activeTab.pairingsGraphState;
    
    const currentIndexes = currentGraphState.selectedConnectionIndexes;
    const existingIndexSet = new Set(currentIndexes);
    
    // Find indexes of pairings that aren't already selected using the lookup map
    const newIndexes: number[] = [];
    pairings.forEach((pairing) => {
      const key = `${pairing.term1}-${pairing.term2}-${pairing.verses[0].reference}`;
      const index = connectionIndexMap.get(key);
      if (index !== undefined && !existingIndexSet.has(index)) {
        newIndexes.push(index);
      }
    });

    if (newIndexes.length > 0) {
      const tabType = activeTab.activeTab === 'linking' ? 'linking' : 'pairings';
      actions.updateGraphState(tabType, { 
        selectedConnectionIndexes: [...currentIndexes, ...newIndexes] 
      });
    }
  }, [actions, activeTab.activeTab, activeTab.pairingsGraphState, activeTab.linkingGraphState, connectionIndexMap]);

  const handleDeselectAllPairings = useCallback(() => {
    const tabType = activeTab.activeTab === 'linking' ? 'linking' : 'pairings';
    actions.updateGraphState(tabType, { selectedConnectionIndexes: [] });
  }, [actions, activeTab.activeTab]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const currentGraphState = activeTab.activeTab === 'linking' 
      ? activeTab.linkingGraphState 
      : activeTab.pairingsGraphState;
    
    const newNodes = currentGraphState.selectedNodes.includes(nodeId)
      ? currentGraphState.selectedNodes.filter(id => id !== nodeId)
      : [...currentGraphState.selectedNodes, nodeId];
    
    const tabType = activeTab.activeTab === 'linking' ? 'linking' : 'pairings';
    actions.updateGraphState(tabType, { selectedNodes: newNodes });
  }, [actions, activeTab.activeTab, activeTab.pairingsGraphState, activeTab.linkingGraphState]);

  const clearNodeSelection = useCallback(() => {
    const tabType = activeTab.activeTab === 'linking' ? 'linking' : 'pairings';
    actions.updateGraphState(tabType, { selectedNodes: [] });
  }, [actions, activeTab.activeTab]);

  const handleGraphTransformChange = useCallback((newTransform: { x: number; y: number; scale: number }) => {
    const tabType = activeTab.activeTab === 'linking' ? 'linking' : 'pairings';
    actions.updateGraphState(tabType, { graphTransform: newTransform });
  }, [actions, activeTab.activeTab]);

  // Computed values
  const allPairingsSelected = useCallback((pairings: VersePairing[]) => {
    if (pairings.length === 0) return false;

    const currentGraphState = activeTab.activeTab === 'linking' 
      ? activeTab.linkingGraphState 
      : activeTab.pairingsGraphState;
    
    const selectedIndexSet = new Set(currentGraphState.selectedConnectionIndexes);

    return pairings.every((pairing) => {
      const key = `${pairing.term1}-${pairing.term2}-${pairing.verses[0].reference}`;
      const index = connectionIndexMap.get(key);
      return index !== undefined && selectedIndexSet.has(index);
    });
  }, [activeTab.activeTab, activeTab.pairingsGraphState, activeTab.linkingGraphState, connectionIndexMap]);

  // Use filter counts from active tab
  const filterCounts = activeTab.filterCounts;

  // Memoize selected connections to avoid expensive recalculations on every render
  const selectedConnections = useMemo(() => {
    return activeTab.activeTab === 'linking' 
      ? getSelectedConnections(activeTab.linkingGraphState.selectedConnectionIndexes, activeTab.linkings)
      : getSelectedConnections(activeTab.pairingsGraphState.selectedConnectionIndexes, activeTab.pairings);
  }, [
    activeTab.activeTab,
    activeTab.linkingGraphState.selectedConnectionIndexes,
    activeTab.pairingsGraphState.selectedConnectionIndexes,
    activeTab.linkings,
    activeTab.pairings
  ]);

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
              linkingsCount={activeTab.linkings.length}
              isDarkMode={activeTab.isDarkMode}
              showGraph={activeTab.showGraph}
              allPairingsSelected={allPairingsSelected(activeTab.activeTab === 'linking' ? activeTab.linkings : activeTab.pairings)}
              onTabChange={(tab) => actions.updateUIState({ activeTab: tab })}
              onSelectAllPairings={() => handleSelectAllPairings(activeTab.activeTab === 'linking' ? activeTab.linkings : activeTab.pairings)}
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
                  linkings={activeTab.linkings}
                  activeTab={activeTab.activeTab}
                  searchTerms={activeTab.searchTerms}
                  pairingsSearchTerms={activeTab.pairingsSearchTerms}
                  isDarkMode={activeTab.isDarkMode}
                  scrollPositionKey={scrollPositionKey}
                  showGraph={activeTab.showGraph}
                  selectedConnections={selectedConnections}
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
                connections={selectedConnections}
                searchTerms={activeTab.searchTerms}
                pairingsSearchTerms={activeTab.pairingsSearchTerms}
                isDarkMode={activeTab.isDarkMode}
                initialTransform={activeTab.activeTab === 'linking' 
                  ? activeTab.linkingGraphState.graphTransform 
                  : activeTab.pairingsGraphState.graphTransform}
                onTransformChange={handleGraphTransformChange}
                selectedNodes={activeTab.activeTab === 'linking' 
                  ? activeTab.linkingGraphState.selectedNodes 
                  : activeTab.pairingsGraphState.selectedNodes}
                onNodeClick={handleNodeClick}
                onClearSelection={clearNodeSelection}
              />
            </div>
          )}
        </div>
    </div>
  );
}
