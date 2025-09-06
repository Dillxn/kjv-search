'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { kjvParser } from '../lib';
import { TabBar } from '../lib/tab-bar';
import { TabManager, TabManagerService } from '../lib/tab-manager';
import { GraphVisualizer } from '../lib/graph-visualizer';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { AppHeader } from '../components/ui/app-header';
import { TabNavigation } from '../components/ui/tab-navigation';
import { SearchResults } from '../components/search/search-results';
import { useSearchState } from '../hooks/use-search-state';
import { useTabStatePersistence } from '../hooks/use-tab-state-persistence';
import { useGraphState } from '../hooks/use-graph-state';
import { testLocalStorage, getLocalStorageInfo } from '../lib/storage-test';
import { DevStorageHelper } from '../lib/dev-storage-helper';
import {
  getBackgroundClass,
  getTextClass,
  getBorderClass,
} from '../lib/theme-utils';

export default function Home() {
  // Tab management
  const [tabManager, setTabManager] = useState<TabManager>(() => {
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

  // Graph state
  const {
    selectedConnections,
    setSelectedConnections,
    handleToggleGraph,
    handleSelectAllPairings,
    handleDeselectAllPairings,
    allPairingsSelected,
  } = useGraphState();

  // UI state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pairings'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  // Generate unique localStorage key for scroll position
  const scrollPositionKey = useMemo(() => {
    return `kjv-scroll-${tabManager.activeTabId}-${activeTab}`;
  }, [tabManager.activeTabId, activeTab]);

  // Handle client-side hydration and load tab state
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);

      testLocalStorage();
      getLocalStorageInfo();

      if (process.env.NODE_ENV === 'development') {
        DevStorageHelper.startDevBackup();
      }

      const currentTabState = TabManagerService.getActiveTab(tabManager);
      if (currentTabState) {
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
    setSelectedConnections,
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
        setIsInitialized(true);
      }
    };
    initializeKJV();
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

      if (
        currentActiveTab &&
        newActiveTab &&
        currentActiveTab.id !== newActiveTab.id
      ) {
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
      setSelectedConnections,
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
    setSelectedBooks([]);
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

  // Loading state
  if (!isInitialized || !hasMounted) {
    return (
      <LoadingSpinner message='Loading KJV text...' isDarkMode={isDarkMode} />
    );
  }

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${getBackgroundClass(
        isDarkMode
      )}`}
    >
      <TabBar
        tabManager={tabManager}
        onTabManagerChange={handleTabManagerChange}
        isDarkMode={isDarkMode}
      />

      <div className={`px-2 flex flex-col flex-1 min-h-0`}>
        <AppHeader
          isDarkMode={isDarkMode}
          showGraph={showGraph}
          searchTerms={searchTerms}
          pairingsSearchTerms={pairingsSearchTerms}
          activeTab={activeTab}
          selectedTestament={selectedTestament}
          selectedBooks={selectedBooks}
          showFilters={showFilters}
          filterCounts={filterCounts}
          onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
          onGraphToggle={() => setShowGraph(!showGraph)}
          onSearchTermsChange={setSearchTerms}
          onPairingsSearchTermsChange={setPairingsSearchTerms}
          onTestamentChange={handleTestamentChange}
          onBookToggle={handleBookToggle}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {/* Content Area */}
        <div className='flex-1 flex gap-2 min-h-0 pb-4'>
          {/* Results Panel */}
          <div
            className={`flex-1 flex flex-col min-h-0 ${
              showGraph ? 'w-1/2' : 'w-full'
            }`}
          >
            <TabNavigation
              activeTab={activeTab}
              resultsCount={results.length}
              pairingsCount={pairings.length}
              isDarkMode={isDarkMode}
              showGraph={showGraph}
              allPairingsSelected={allPairingsSelected(pairings)}
              onTabChange={setActiveTab}
              onSelectAllPairings={() => handleSelectAllPairings(pairings)}
              onDeselectAllPairings={() => handleDeselectAllPairings(pairings)}
            />

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
                <GraphVisualizer
                  connections={selectedConnections}
                  searchTerms={searchTerms}
                  pairingsSearchTerms={pairingsSearchTerms}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
