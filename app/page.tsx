'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { kjvParser, VersePairing } from '../lib';
import { TabBar } from '../lib/tab-bar';
import { GraphVisualizer } from '../lib/graph-visualizer';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { AppHeader } from '../components/ui/app-header';
import { TabNavigation } from '../components/ui/tab-navigation';
import { SearchResults } from '../components/search/search-results';
import { CardinalityType } from '../components/ui/cardinality-toggle';

import { useTabReducer, getSelectedConnections, getConnectionKeys } from '../hooks/use-tab-reducer';
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
    const currentGraphState = activeTab.linkingGraphState;

    const connectionKey = `${connection.word1}-${connection.word2}-${connection.reference}`;

    // Verify the connection still exists in current results
    const allConnections = activeTab.linkings;
    const connectionExists = allConnections.some(conn => {
      const connKey = `${conn.term1}-${conn.term2}-${conn.verses[0].reference}`;
      return connKey === connectionKey;
    });

    if (!connectionExists) return; // Connection not found in current results

    const currentKeys = currentGraphState.selectedConnectionKeys;
    const exists = currentKeys.includes(connectionKey);

    const newKeys = exists
      ? currentKeys.filter(key => key !== connectionKey)
      : [...currentKeys, connectionKey];

    actions.updateGraphState({ selectedConnectionKeys: newKeys });
  }, [actions, activeTab.linkingGraphState, activeTab.linkings]);

  const handleSelectAllPairings = useCallback((pairings: VersePairing[]) => {
    const currentGraphState = activeTab.linkingGraphState;

    const currentKeys = currentGraphState.selectedConnectionKeys;
    const existingKeySet = new Set(currentKeys);

    // Find keys of pairings that aren't already selected
    const newKeys: string[] = [];
    pairings.forEach((pairing) => {
      const key = `${pairing.term1}-${pairing.term2}-${pairing.verses[0].reference}`;
      if (!existingKeySet.has(key)) {
        newKeys.push(key);
      }
    });

    if (newKeys.length > 0) {
      actions.updateGraphState({
        selectedConnectionKeys: [...currentKeys, ...newKeys]
      });
    }
  }, [actions, activeTab.linkingGraphState]);

  const handleDeselectAllPairings = useCallback(() => {
    const currentGraphState = activeTab.linkingGraphState;
    const selectedKeys = currentGraphState.selectedConnectionKeys;

    // Clear cardinality values for all currently selected connections
    selectedKeys.forEach(connectionKey => {
      actions.updateConnectionCardinality(connectionKey, null);
    });

    // Clear the selected connection keys
    actions.updateGraphState({ selectedConnectionKeys: [] });
  }, [actions, activeTab.linkingGraphState]);

  const handleNodeClick = useCallback((nodeId: string | string[]) => {
    const currentGraphState = activeTab.linkingGraphState;

    let newNodes: string[];
    if (Array.isArray(nodeId)) {
      // Direct set of selected nodes (used for filtering out invalid nodes)
      console.log('handleNodeClick called with array:', nodeId);
      newNodes = nodeId;
    } else {
      // Toggle individual node
      console.log('handleNodeClick called with string:', nodeId);
      newNodes = currentGraphState.selectedNodes.includes(nodeId)
        ? currentGraphState.selectedNodes.filter(id => id !== nodeId)
        : [...currentGraphState.selectedNodes, nodeId];
    }

    console.log('Updating selectedNodes from:', currentGraphState.selectedNodes, 'to:', newNodes);
    actions.updateGraphState({ selectedNodes: newNodes });
  }, [actions, activeTab.linkingGraphState]);

  const clearNodeSelection = useCallback(() => {
    actions.updateGraphState({ selectedNodes: [] });
  }, [actions]);

  const handleGraphTransformChange = useCallback((newTransform: { x: number; y: number; scale: number }) => {
    actions.updateGraphState({ graphTransform: newTransform });
  }, [actions]);

  const handlePathIndexChange = useCallback((index: number) => {
    console.log('Setting path index to:', index);
    actions.updateGraphState({ currentPathIndex: index });
  }, [actions]);

  const handleEdgeExclusionToggle = useCallback((edgeId: string) => {
    actions.toggleEdgeExclusion(edgeId);
  }, [actions]);

  const handleUpdateCardinality = useCallback((connectionKey: string, cardinality: CardinalityType) => {
    actions.updateConnectionCardinality(connectionKey, cardinality);
  }, [actions]);

  const handleBulkCardinalityChange = useCallback((cardinality: CardinalityType) => {
    // First add all pairings to graph
    handleSelectAllPairings(activeTab.linkings);

    // Then set the cardinality for all of them
    activeTab.linkings.forEach(pairing => {
      const connectionKey = `${pairing.term1}-${pairing.term2}-${pairing.verses[0].reference}`;
      actions.updateConnectionCardinality(connectionKey, cardinality);
    });
  }, [actions, activeTab.linkings, handleSelectAllPairings]);

  // Computed values
  const allPairingsSelected = useCallback((pairings: VersePairing[]) => {
    if (pairings.length === 0) return false;

    const currentGraphState = activeTab.linkingGraphState;

    const selectedKeySet = new Set(currentGraphState.selectedConnectionKeys);

    return pairings.every((pairing) => {
      const key = `${pairing.term1}-${pairing.term2}-${pairing.verses[0].reference}`;
      return selectedKeySet.has(key);
    });
  }, [activeTab.linkingGraphState]);

  // Check if all selected pairings have the same cardinality type
  const allSelectedHaveSameCardinality = useCallback(() => {
    const currentGraphState = activeTab.linkingGraphState;
    const selectedKeys = currentGraphState.selectedConnectionKeys;
    const cardinalities = currentGraphState.connectionCardinalities;

    if (selectedKeys.length === 0) return false;

    // Get cardinality values for all selected connections
    const selectedCardinalities = selectedKeys
      .map(key => cardinalities[key])
      .filter(cardinality => cardinality !== null && cardinality !== undefined);

    if (selectedCardinalities.length === 0) return false;

    // Check if all have the same cardinality
    const firstCardinality = selectedCardinalities[0];
    return selectedCardinalities.every(cardinality => cardinality === firstCardinality);
  }, [activeTab.linkingGraphState]);

  // Get the common cardinality type of all selected pairings (if they all have the same)
  const getSelectedCardinalityType = useCallback((): CardinalityType | null => {
    const currentGraphState = activeTab.linkingGraphState;
    const selectedKeys = currentGraphState.selectedConnectionKeys;
    const cardinalities = currentGraphState.connectionCardinalities;

    if (selectedKeys.length === 0) return null;

    // Get cardinality values for all selected connections
    const selectedCardinalities = selectedKeys
      .map(key => cardinalities[key])
      .filter(cardinality => cardinality !== null && cardinality !== undefined);

    if (selectedCardinalities.length === 0) return null;

    // Check if all have the same cardinality
    const firstCardinality = selectedCardinalities[0];
    const allSame = selectedCardinalities.every(cardinality => cardinality === firstCardinality);

    return allSame ? firstCardinality : null;
  }, [activeTab.linkingGraphState]);

  // Use filter counts from active tab
  const filterCounts = activeTab.filterCounts;

  // Memoize selected connections to avoid expensive recalculations on every render
  const selectedConnections = useMemo(() => {
    const connections = getSelectedConnections(activeTab.linkingGraphState.selectedConnectionKeys, activeTab.linkings);
    console.log('selectedConnections recalculated:', {
      keys: activeTab.linkingGraphState.selectedConnectionKeys.length,
      connections: connections.length,
      connectionWords: connections.map(c => `${c.word1}-${c.word2}`)
    });
    return connections;
  }, [
    activeTab.linkingGraphState.selectedConnectionKeys,
    activeTab.linkings
  ]);


  // Get excluded edges for current tab
  const excludedEdges = useMemo(() => {
    return activeTab.linkingGraphState.excludedEdges;
  }, [
    activeTab.linkingGraphState.excludedEdges
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
        activeTab={activeTab.activeTab}
        selectedTestament={activeTab.selectedTestament}
        selectedBooks={activeTab.selectedBooks}
        maxProximity={activeTab.maxProximity}
        showFilters={activeTab.showFilters}
        filterCounts={filterCounts}
        onDarkModeToggle={() => actions.updateUIState({ isDarkMode: !activeTab.isDarkMode })}
        onGraphToggle={() => actions.updateUIState({ showGraph: !activeTab.showGraph })}
        onSearchTermsChange={(terms) => actions.updateSearchTerms(terms)}
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
              pairingsCount={activeTab.linkings.length}
              linkingsCount={activeTab.linkings.length}
              isDarkMode={activeTab.isDarkMode}
              showGraph={activeTab.showGraph}
              allPairingsSelected={allPairingsSelected(activeTab.linkings)}
              allSelectedHaveSameCardinality={allSelectedHaveSameCardinality()}
              selectedCardinalityType={getSelectedCardinalityType()}
              onTabChange={(tab) => actions.updateUIState({ activeTab: tab })}
              onSelectAllPairings={() => handleSelectAllPairings(activeTab.linkings)}
              onDeselectAllPairings={handleDeselectAllPairings}
              onBulkCardinalityChange={handleBulkCardinalityChange}
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
                  pairings={activeTab.linkings}
                  linkings={activeTab.linkings}
                  activeTab={activeTab.activeTab}
                  searchTerms={activeTab.searchTerms}
                  isDarkMode={activeTab.isDarkMode}
                  scrollPositionKey={scrollPositionKey}
                  showGraph={activeTab.showGraph}
                  selectedConnections={selectedConnections}
                  onToggleGraph={handleToggleGraph}
                  onUpdateCardinality={handleUpdateCardinality}
                  connectionCardinalities={activeTab.linkingGraphState.connectionCardinalities}
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
                isDarkMode={activeTab.isDarkMode}
                initialTransform={activeTab.linkingGraphState.graphTransform}
                onTransformChange={handleGraphTransformChange}
                selectedNodes={activeTab.linkingGraphState.selectedNodes}
                onNodeClick={handleNodeClick}
                onClearSelection={clearNodeSelection}
                currentPathIndex={activeTab.linkingGraphState.currentPathIndex}
                onPathIndexChange={handlePathIndexChange}
                excludedEdges={excludedEdges}
                onEdgeExclusionToggle={handleEdgeExclusionToggle}
                connectionCardinalities={activeTab.linkingGraphState.connectionCardinalities}
                onToggleGraph={handleToggleGraph}
                onUpdateCardinality={handleUpdateCardinality}
              />
            </div>
          )}
        </div>
    </div>
  );
}
