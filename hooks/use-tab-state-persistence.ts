import { useEffect, useCallback } from 'react';
import { TabManager, TabManagerService, TabState } from '../lib/tab-manager';

interface TabStatePersistenceProps {
  tabManager: TabManager;
  searchTerms: string;
  pairingsSearchTerms: string;
  selectedTestament: 'all' | 'old' | 'new';
  selectedBooks: string[];
  showFilters: boolean;
  activeTab: 'all' | 'pairings';
  isDarkMode: boolean;
  showGraph: boolean;
  selectedConnections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions: number[];
  }>;
  hasMounted: boolean;
}

export function useTabStatePersistence({
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
}: TabStatePersistenceProps) {
  
  // Create current tab state object
  const getCurrentTabState = useCallback((): Partial<Omit<TabState, 'id'>> => ({
    searchTerms,
    pairingsSearchTerms,
    selectedTestament,
    selectedBooks,
    showFilters,
    activeTab,
    isDarkMode,
    showGraph,
    selectedConnections: selectedConnections.map((conn) => ({
      ...conn,
      versePositions: conn.versePositions || [],
    })),
  }), [
    searchTerms,
    pairingsSearchTerms,
    selectedTestament,
    selectedBooks,
    showFilters,
    activeTab,
    isDarkMode,
    showGraph,
    selectedConnections,
  ]);

  // Update current tab state helper with debouncing
  const updateCurrentTabState = useCallback(
    (updates: Partial<Omit<TabState, 'id'>>) => {
      if (!hasMounted) return;

      const activeTab = TabManagerService.getActiveTab(tabManager);
      if (activeTab) {
        TabManagerService.updateTabState(tabManager, activeTab.id, updates);
      }
    },
    [hasMounted, tabManager]
  );

  // Debounced update of tab state
  useEffect(() => {
    if (!hasMounted) return;

    const timeoutId = setTimeout(() => {
      updateCurrentTabState(getCurrentTabState());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [hasMounted, updateCurrentTabState, getCurrentTabState]);

  // Save state on unmount and page events
  useEffect(() => {
    const saveCurrentState = () => {
      if (!hasMounted) return;

      const currentActiveTab = TabManagerService.getActiveTab(tabManager);
      if (currentActiveTab) {
        TabManagerService.updateTabState(tabManager, currentActiveTab.id, getCurrentTabState());
      }
    };

    const handleBeforeUnload = () => saveCurrentState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveCurrentState();
    };
  }, [tabManager, hasMounted, getCurrentTabState]);

  return { updateCurrentTabState, getCurrentTabState };
}