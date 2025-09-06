'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { kjvParser } from '../lib';
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

  // Convert reducer state to legacy TabManager format for TabBar component
  const legacyTabManager = useMemo(() => ({
    tabs: state.tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      searchTerms: tab.searchTerms,
      pairingsSearchTerms: tab.pairingsSearchTerms,
      selectedTestament: tab.selectedTestament,
      selectedBooks: tab.selectedBooks,
      maxProximity: tab.maxProximity,
      showFilters: tab.showFilters,
      activeTab: tab.activeTab,
      scrollPosition: 0,
      isDarkMode: tab.isDarkMode,
      showGraph: tab.showGraph,
      selectedConnections: tab.selectedConnections,
      selectedNodes: tab.selectedNodes,
      graphTransform: tab.graphTransform,
    })),
    activeTabId: state.activeTabId,
  }), [state]);

  // Handle tab manager changes (convert from legacy format)
  const handleTabManagerChange = useCallback((newTabManager: any) => {
    if (newTabManager.activeTabId !== state.activeTabId) {
      actions.switchTab(newTabManager.activeTabId);
    }
    
    // Handle other tab operations
    const currentTabIds = new Set(state.tabs.map(t => t.id));
    const newTabIds = new Set(newTabManager.tabs.map((t: any) => t.id));
    
    // Check for removed tabs
    for (const currentId of currentTabIds) {
      if (!newTabIds.has(currentId)) {
        actions.removeTab(currentId);
        return;
      }
    }
    
    // Check for added tabs
    for (const newTab of newTabManager.tabs) {
      if (!currentTabIds.has(newTab.id)) {
        actions.addTab(newTab.name);
        return;
      }
    }
    
    // Check for renamed tabs
    for (const newTab of newTabManager.tabs) {
      const currentTab = state.tabs.find(t => t.id === newTab.id);
      if (currentTab && currentTab.name !== newTab.name) {
        actions.renameTab(newTab.id, newTab.name);
        return;
      }
    }
  }, [state, actions]);

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
  const handleToggleGraph = useCallback((connection: any) => {
    const exists = activeTab.selectedConnections.some(conn => 
      conn.word1 === connection.word1 && 
      conn.word2 === connection.word2 && 
      conn.reference === connection.reference
    );
    
    const newConnections = exists
      ? activeTab.selectedConnections.filter(conn => 
          !(conn.word1 === connection.word1 && 
            conn.word2 === connection.word2 && 
            conn.reference === connection.reference))
      : [...activeTab.selectedConnections, connection];
    
    actions.updateGraphState({ selectedConnections: newConnections });
  }, [actions, activeTab.selectedConnections]);

  const handleSelectAllPairings = useCallback((pairings: any[]) => {
    const newConnections = pairings.map(pairing => ({
      word1: pairing.term1, // Use term1 instead of word1
      word2: pairing.term2, // Use term2 instead of word2
      reference: pairing.verses[0].reference,
      versePositions: pairing.verses.map((v: any) => v.position),
    }));
    actions.updateGraphState({ selectedConnections: newConnections });
  }, [actions]);

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
  const allPairingsSelected = useCallback((pairings: any[]) => {
    return pairings.length > 0 && pairings.every(pairing =>
      activeTab.selectedConnections.some(conn =>
        conn.word1 === pairing.term1 && // Use term1 instead of word1
        conn.word2 === pairing.term2 && // Use term2 instead of word2
        conn.reference === pairing.verses[0].reference
      )
    );
  }, [activeTab.selectedConnections]);

  // Calculate filter counts (simplified - could be moved to reducer if needed)
  const filterCounts = useMemo(() => ({
    total: activeTab.results.length,
    oldTestament: 0, // Could calculate if needed
    newTestament: 0, // Could calculate if needed
    books: {} as Record<string, number>, // Could calculate if needed
  }), [activeTab.results.length]);

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
        tabManager={legacyTabManager}
        onTabManagerChange={handleTabManagerChange}
        isDarkMode={activeTab.isDarkMode}
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
