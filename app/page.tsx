'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { kjvParser, VersePairing } from '../lib/kjv-parser';
import { TabBar } from '../lib/tab-bar';
import { TabManager, TabState, TabManagerService } from '../lib/tab-manager';
import { GraphVisualizer } from '../lib/graph-visualizer';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { ToggleButton } from '../components/ui/toggle-button';
import { SearchInput } from '../components/search/search-input';
import { FilterControls } from '../components/search/filter-controls';
import { SearchResults } from '../components/search/search-results';
import { useSearchState } from '../hooks/use-search-state';
import { testLocalStorage, getLocalStorageInfo } from '../lib/storage-test';

export default function Home() {
  // Tab management
  const [tabManager, setTabManager] = useState<TabManager>(() =>
    TabManagerService.loadTabManager()
  );
  const activeTabState = TabManagerService.getActiveTab(tabManager);

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
  const [compactMode, setCompactMode] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [selectedConnections, setSelectedConnections] = useState<Array<{
    word1: string;
    word2: string;
    reference: string;
  }>>([]);

  // Generate unique localStorage key for scroll position
  const scrollPositionKey = useMemo(() => {
    return `kjv-scroll-${tabManager.activeTabId}-${activeTab}`;
  }, [tabManager.activeTabId, activeTab]);

  // Handle client-side hydration and load tab state
  useEffect(() => {
    setHasMounted(true);
    if (!hasMounted) {
      // Test localStorage functionality
      console.log('=== localStorage Debug Info ===');
      testLocalStorage();
      getLocalStorageInfo();
      console.log('==============================');
      
      const currentTabState = TabManagerService.getActiveTab(tabManager);
      if (currentTabState) {
        console.log('Loading tab state:', currentTabState);
        // Load all tab state on mount
        setSearchTerms(currentTabState.searchTerms);
        setPairingsSearchTerms(currentTabState.pairingsSearchTerms);
        setSelectedTestament(currentTabState.selectedTestament);
        setSelectedBooks(currentTabState.selectedBooks);
        setShowFilters(currentTabState.showFilters);
        setActiveTab(currentTabState.activeTab);
        setIsDarkMode(currentTabState.isDarkMode);
        setCompactMode(currentTabState.compactMode);
        setShowGraph(currentTabState.showGraph || false);
        const connections = currentTabState.selectedConnections;
        setSelectedConnections(Array.isArray(connections) ? connections : []);
      }
    }
  }, [hasMounted, tabManager]);

  // Initialize KJV parser
  useEffect(() => {
    const initializeKJV = async () => {
      try {
        console.log('Starting KJV initialization...');
        await kjvParser.fetchAndParse();
        console.log('KJV initialization complete, verses loaded:', kjvParser.getVerses().length);
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
      const baseOffset = compactMode ? 140 : 180;
      setContainerHeight(window.innerHeight - baseOffset);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [compactMode]);

  // Perform search when dependencies change
  useEffect(() => {
    if (isInitialized) {
      performSearch(activeTab);
    }
  }, [debouncedSearchTerms, debouncedPairingsSearchTerms, activeTab, isInitialized, performSearch]);

  // Update current tab state helper with debouncing
  const updateCurrentTabState = useCallback(
    (updates: Partial<Omit<TabState, 'id'>>) => {
      setTabManager((prevTabManager) => {
        const activeTab = TabManagerService.getActiveTab(prevTabManager);
        if (activeTab) {
          return TabManagerService.updateTabState(
            prevTabManager,
            activeTab.id,
            updates
          );
        }
        return prevTabManager;
      });
    },
    []
  );

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
        const updatedTabManager = TabManagerService.updateTabState(
          tabManager,
          currentActiveTab.id,
          {
            searchTerms,
            pairingsSearchTerms,
            selectedTestament,
            selectedBooks,
            showFilters,
            activeTab,
            isDarkMode,
            compactMode,
            showGraph,
            selectedConnections,
          }
        );

        // Load new tab state
        setSearchTerms(newActiveTab.searchTerms);
        setPairingsSearchTerms(newActiveTab.pairingsSearchTerms);
        setSelectedTestament(newActiveTab.selectedTestament);
        setSelectedBooks(newActiveTab.selectedBooks);
        setShowFilters(newActiveTab.showFilters);
        setActiveTab(newActiveTab.activeTab);
        setIsDarkMode(newActiveTab.isDarkMode);
        setCompactMode(newActiveTab.compactMode || false);
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
      compactMode,
      showGraph,
      selectedConnections,
    ]
  );

  // Debounced update of tab state to prevent excessive localStorage writes
  useEffect(() => {
    if (!hasMounted) return; // Don't save during initial load
    
    const timeoutId = setTimeout(() => {
      updateCurrentTabState({
        searchTerms,
        pairingsSearchTerms,
        selectedTestament,
        selectedBooks,
        showFilters,
        activeTab,
        isDarkMode,
        compactMode,
        showGraph,
        selectedConnections,
      });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [
    searchTerms,
    pairingsSearchTerms,
    selectedTestament,
    selectedBooks,
    showFilters,
    activeTab,
    isDarkMode,
    compactMode,
    showGraph,
    selectedConnections,
    hasMounted,
    updateCurrentTabState,
  ]);

  // Save current tab state on unmount or page refresh
  useEffect(() => {
    const saveCurrentState = () => {
      const currentActiveTab = TabManagerService.getActiveTab(tabManager);
      if (currentActiveTab) {
        TabManagerService.updateTabState(
          tabManager,
          currentActiveTab.id,
          {
            searchTerms,
            pairingsSearchTerms,
            selectedTestament,
            selectedBooks,
            showFilters,
            activeTab,
            isDarkMode,
            compactMode,
            showGraph,
            selectedConnections,
          }
        );
      }
    };

    // Save state before page unload
    const handleBeforeUnload = () => {
      saveCurrentState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function to save state on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveCurrentState();
    };
  }, [
    tabManager,
    searchTerms,
    pairingsSearchTerms,
    selectedTestament,
    selectedBooks,
    showFilters,
    activeTab,
    isDarkMode,
    compactMode,
    showGraph,
    selectedConnections,
  ]);

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

  const handleAddToGraph = useCallback((pairing: VersePairing) => {
    const connections = Array.isArray(selectedConnections) ? selectedConnections : [];
    const versePositions = pairing.verses.map(v => v.position);
    
    // Check if this specific pairing (with same verse positions) is already in graph
    const isInGraph = connections.some(conn => {
      const positionsMatch = conn.versePositions && 
        conn.versePositions.length === versePositions.length &&
        conn.versePositions.every(pos => versePositions.includes(pos));
      
      const wordsMatch = (conn.word1 === pairing.term1 && conn.word2 === pairing.term2) ||
                        (conn.word1 === pairing.term2 && conn.word2 === pairing.term1);
      
      return wordsMatch && positionsMatch;
    });

    if (!isInGraph) {
      const verseRef = pairing.verses.length === 1 
        ? pairing.verses[0].reference
        : `${pairing.verses[0].reference} & ${pairing.verses[1].reference}`;
      
      setSelectedConnections(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return [...prevArray, {
          word1: pairing.term1,
          word2: pairing.term2,
          reference: verseRef,
          versePositions: versePositions
        }];
      });
    }
  }, [selectedConnections]);

  // Loading state
  if (!isInitialized || !hasMounted) {
    return <LoadingSpinner message="Loading KJV text..." isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <TabBar
        tabManager={tabManager}
        onTabManagerChange={handleTabManagerChange}
        isDarkMode={isDarkMode}
        compactMode={compactMode}
      />
      
      <div className={`max-w-6xl mx-auto px-2 h-full flex flex-col ${compactMode ? 'py-1' : 'py-2'}`}>
        {/* Header */}
        <div className={`rounded-lg shadow-md mb-2 ${compactMode ? 'p-1' : 'p-1.5'} ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className='flex justify-between items-center mb-1'>
            <h1 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              KJV Bible Search
            </h1>
            <div className='flex gap-1'>
              <ToggleButton
                isActive={showGraph}
                onClick={() => setShowGraph(!showGraph)}
                activeIcon="🕸️"
                inactiveIcon="🕸️"
                title={showGraph ? 'Hide graph visualizer' : 'Show graph visualizer'}
                isDarkMode={isDarkMode}
              />
              <ToggleButton
                isActive={compactMode}
                onClick={() => setCompactMode(!compactMode)}
                activeIcon="📱"
                inactiveIcon="📱"
                title={compactMode ? 'Disable compact mode' : 'Enable compact mode for low resolution screens'}
                isDarkMode={isDarkMode}
              />
              <ToggleButton
                isActive={isDarkMode}
                onClick={() => setIsDarkMode(!isDarkMode)}
                activeIcon="☀️"
                inactiveIcon="🌙"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Search Inputs */}
          <SearchInput
            value={searchTerms}
            onChange={setSearchTerms}
            placeholder="Start typing to search... (min 2 characters)"
            label="Enter search words (separated by spaces):"
            isDarkMode={isDarkMode}
          />

          {activeTab === 'pairings' && (
            <SearchInput
              value={pairingsSearchTerms}
              onChange={setPairingsSearchTerms}
              placeholder="Enter second group of words..."
              label="Second search group (for pairings):"
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
            compactMode={compactMode}
            onTestamentChange={handleTestamentChange}
            onBookToggle={handleBookToggle}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* Content Area */}
        <div className='flex-1 flex gap-2 min-h-0'>
          {/* Results Panel */}
          <div className={`flex-1 flex flex-col min-h-0 ${showGraph ? 'w-1/2' : 'w-full'}`}>
            {/* Tab Navigation */}
            <div className={`flex mb-2 ${compactMode ? 'gap-0.5' : 'gap-1'}`}>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-medium rounded-t-lg transition-colors ${
                  activeTab === 'all'
                    ? isDarkMode
                      ? 'bg-gray-700 text-white border-b-2 border-blue-400'
                      : 'bg-white text-gray-900 border-b-2 border-blue-500'
                    : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-800'
                }`}
              >
                All Results ({results.length})
              </button>
              <button
                onClick={() => setActiveTab('pairings')}
                className={`px-3 py-1 text-xs font-medium rounded-t-lg transition-colors ${
                  activeTab === 'pairings'
                    ? isDarkMode
                      ? 'bg-gray-700 text-white border-b-2 border-blue-400'
                      : 'bg-white text-gray-900 border-b-2 border-blue-500'
                    : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-800'
                }`}
              >
                Pairings ({pairings.length})
              </button>
            </div>

            {/* Search Results */}
            <div className='flex-1 min-h-0'>
              {error ? (
                <div className={`flex items-center justify-center h-full ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
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
                  compactMode={compactMode}
                  scrollPositionKey={scrollPositionKey}
                  showGraph={showGraph}
                  selectedConnections={selectedConnections}
                  onAddToGraph={handleAddToGraph}
                />
              )}
            </div>
          </div>

          {/* Graph Panel */}
          {showGraph && (
            <div className={`w-1/2 rounded-lg shadow-md ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className='flex justify-between items-center'>
                  <h3 className={`text-sm font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
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
              <div className='flex-1' style={{ height: containerHeight - 60 }}>
                <GraphVisualizer connections={selectedConnections} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}