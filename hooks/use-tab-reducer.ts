'use client';

import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { SearchResult, VersePairing, kjvParser, OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS } from '../lib';
import { APP_CONFIG } from '../lib/constants';
import { SearchTermProcessor, SearchStateValidator } from '../lib/search-utils';
import { DevStorageHelper } from '../lib/dev-storage-helper';

// Complete tab state including search results
export interface TabState {
  id: string;
  name: string;
  searchTerms: string;
  pairingsSearchTerms: string;
  selectedTestament: 'all' | 'old' | 'new';
  selectedBooks: string[];
  maxProximity: number;
  showFilters: boolean;
  activeTab: 'all' | 'pairings' | 'linking';
  isDarkMode: boolean;
  showGraph: boolean;
  // Separate graph states for pairings and linking tabs
  pairingsGraphState: {
    selectedConnections: Array<{
      word1: string;
      word2: string;
      reference: string;
      versePositions: number[];
    }>;
    selectedNodes: string[];
    graphTransform: {
      x: number;
      y: number;
      scale: number;
    };
  };
  linkingGraphState: {
    selectedConnections: Array<{
      word1: string;
      word2: string;
      reference: string;
      versePositions: number[];
    }>;
    selectedNodes: string[];
    graphTransform: {
      x: number;
      y: number;
      scale: number;
    };
  };
  // Search results stored directly in tab state
  results: SearchResult[];
  pairings: VersePairing[];
  linkings: VersePairing[];
  isLoading: boolean;
  error: string;
  lastSearchKey: string; // To track if search needs to be re-run
  // Filter counts
  filterCounts: {
    total: number;
    oldTestament: number;
    newTestament: number;
    books: Record<string, number>;
  };
}

export interface TabReducerState {
  tabs: TabState[];
  activeTabId: string;
  isInitialized: boolean;
  version?: string; // For handling storage migrations
}

// Action types
export type TabAction =
  | { type: 'INITIALIZE'; payload: { tabs: TabState[]; activeTabId: string } }
  | { type: 'ADD_TAB'; payload: { name?: string } }
  | { type: 'REMOVE_TAB'; payload: { tabId: string } }
  | { type: 'SWITCH_TAB'; payload: { tabId: string } }
  | { type: 'RENAME_TAB'; payload: { tabId: string; name: string } }
  | { type: 'DUPLICATE_TAB'; payload: { tabId: string } }
  | { type: 'UPDATE_SEARCH_TERMS'; payload: { searchTerms: string; pairingsSearchTerms: string } }
  | { type: 'UPDATE_FILTERS'; payload: { selectedTestament: 'all' | 'old' | 'new'; selectedBooks: string[]; maxProximity: number } }
  | { type: 'UPDATE_UI_STATE'; payload: { showFilters?: boolean; activeTab?: 'all' | 'pairings' | 'linking'; isDarkMode?: boolean; showGraph?: boolean } }
  | { type: 'UPDATE_GRAPH_STATE'; payload: { tabType: 'pairings' | 'linking'; selectedConnections?: Array<{ word1: string; word2: string; reference: string; versePositions: number[]; }>; selectedNodes?: string[]; graphTransform?: { x: number; y: number; scale: number; } } }
  | { type: 'SET_SEARCH_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_SEARCH_RESULTS'; payload: { results: SearchResult[]; pairings: VersePairing[]; linkings: VersePairing[]; error?: string } }
  | { type: 'SET_SEARCH_ERROR'; payload: { error: string } }
  | { type: 'UPDATE_FILTER_COUNTS'; payload: { filterCounts: TabState['filterCounts'] } };

const DEFAULT_TAB_STATE: Omit<TabState, 'id' | 'name'> = {
  searchTerms: '',
  pairingsSearchTerms: '',
  selectedTestament: 'all',
  selectedBooks: [],
  maxProximity: APP_CONFIG.PAIRINGS.MAX_PROXIMITY,
  showFilters: false,
  activeTab: 'all',
  isDarkMode: false,
  showGraph: false,
  pairingsGraphState: {
    selectedConnections: [],
    selectedNodes: [],
    graphTransform: { x: 0, y: 0, scale: 1 },
  },
  linkingGraphState: {
    selectedConnections: [],
    selectedNodes: [],
    graphTransform: { x: 0, y: 0, scale: 1 },
  },
  results: [],
  pairings: [],
  linkings: [],
  isLoading: false,
  error: '',
  lastSearchKey: '',
  filterCounts: {
    total: 0,
    oldTestament: 0,
    newTestament: 0,
    books: {},
  },
};

const STORAGE_KEY = 'kjv-tab-reducer-state';
const STORAGE_VERSION = '2.0'; // Increment when breaking changes are made to storage format
const MAX_TABS = APP_CONFIG.TABS.MAX_TABS;



function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateSearchKey(tab: TabState): string {
  return `${tab.searchTerms}|${tab.pairingsSearchTerms}|${tab.activeTab}|${tab.selectedTestament}|${tab.selectedBooks.join(',')}|${tab.maxProximity}`;
}

function createDefaultState(): TabReducerState {
  const defaultTab: TabState = {
    id: generateTabId(),
    name: 'Search 1',
    ...DEFAULT_TAB_STATE,
  };

  return {
    tabs: [defaultTab],
    activeTabId: defaultTab.id,
    isInitialized: false,
    version: STORAGE_VERSION,
  };
}

function loadStateFromStorage(): TabReducerState {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as TabReducerState;
      
      // Check if we need to migrate from an older version
      if (!parsed.version || parsed.version !== STORAGE_VERSION) {
        console.log('Migrating localStorage from version', parsed.version || '1.0', 'to', STORAGE_VERSION);
        // Clear localStorage for major version changes to avoid conflicts
        if (!parsed.version) {
          console.log('Clearing old localStorage format and starting fresh');
          localStorage.removeItem(STORAGE_KEY);
          return createDefaultState();
        }
      }
      
      // Validate and migrate data
      if (parsed.tabs.length === 0) {
        return createDefaultState();
      }

      // Ensure activeTabId exists
      if (!parsed.tabs.find(tab => tab.id === parsed.activeTabId)) {
        parsed.activeTabId = parsed.tabs[0].id;
      }

      // Migrate tabs to include new fields
      parsed.tabs = parsed.tabs.map(tab => {
        // Handle migration from old single graph state to separate pairings/linking states
        const legacySelectedConnections = (tab as any).selectedConnections || [];
        const legacySelectedNodes = (tab as any).selectedNodes || [];
        const legacyGraphTransform = (tab as any).graphTransform || { x: 0, y: 0, scale: 1 };
        
        const migratedTab = {
          ...DEFAULT_TAB_STATE,
          // Explicitly preserve only the properties we want to keep from the stored tab
          id: tab.id,
          name: tab.name,
          searchTerms: tab.searchTerms || '',
          pairingsSearchTerms: tab.pairingsSearchTerms || '',
          selectedTestament: tab.selectedTestament || 'all',
          selectedBooks: tab.selectedBooks || [],
          maxProximity: tab.maxProximity || DEFAULT_TAB_STATE.maxProximity,
          showFilters: tab.showFilters || false,
          activeTab: tab.activeTab || 'all',
          isDarkMode: tab.isDarkMode || false,
          showGraph: tab.showGraph || false,
          // Migrate legacy graph state to both pairings and linking (they can diverge from here)
          pairingsGraphState: (tab as any).pairingsGraphState || {
            selectedConnections: legacySelectedConnections.map((conn: any) => ({
              ...conn,
              versePositions: conn.versePositions || [],
            })),
            selectedNodes: legacySelectedNodes,
            graphTransform: legacyGraphTransform,
          },
          linkingGraphState: (tab as any).linkingGraphState || {
            selectedConnections: legacySelectedConnections.map((conn: any) => ({
              ...conn,
              versePositions: conn.versePositions || [],
            })),
            selectedNodes: legacySelectedNodes,
            graphTransform: legacyGraphTransform,
          },
          // Reset transient state
          results: [], // Always start with empty results - they'll be regenerated
          pairings: [], // Always start with empty pairings - they'll be regenerated
          linkings: [], // Always start with empty linkings - they'll be regenerated
          isLoading: false, // Reset loading state on load
          error: '', // Reset error state on load
          lastSearchKey: '', // Reset search key to force re-search
          filterCounts: {
            total: 0,
            oldTestament: 0,
            newTestament: 0,
            books: {},
          },
        };
        
        // Debug logging for loaded connections
        if (migratedTab.pairingsGraphState.selectedConnections.length > 0 || migratedTab.linkingGraphState.selectedConnections.length > 0) {
          console.log(`Loading tab "${migratedTab.name}" with selected connections:`, {
            pairings: migratedTab.pairingsGraphState.selectedConnections.length,
            linking: migratedTab.linkingGraphState.selectedConnections.length
          });
        }
        
        return migratedTab;
      });

      return { ...parsed, isInitialized: true, version: STORAGE_VERSION };
    }
  } catch (error) {
    console.error('Failed to load tab state from localStorage:', error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (clearError) {
      console.error('Failed to clear corrupted data:', clearError);
    }
  }

  return createDefaultState();
}

// Throttle saves to prevent excessive localStorage writes
let saveTimeout: NodeJS.Timeout | null = null;
let pendingState: TabReducerState | null = null;

function saveStateToStorage(state: TabReducerState): void {
  if (typeof window === 'undefined') return;

  // Store the latest state
  pendingState = state;

  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Throttle saves to every 100ms
  saveTimeout = setTimeout(() => {
    if (!pendingState) return;

    try {
      // Debug logging for selected connections
      const activeTab = pendingState?.tabs.find(tab => tab.id === pendingState?.activeTabId);
      if (activeTab && (activeTab.pairingsGraphState.selectedConnections.length > 0 || activeTab.linkingGraphState.selectedConnections.length > 0)) {
        console.log('Saving tab state with selected connections:', {
          pairings: activeTab.pairingsGraphState.selectedConnections.length,
          linking: activeTab.linkingGraphState.selectedConnections.length
        });
      }
      
      // Check storage usage and cleanup if needed
      if (DevStorageHelper.isStorageNearLimit()) {
        console.warn('localStorage near capacity, cleaning up old data');
        DevStorageHelper.cleanupOldData();
      }

    // Create a lightweight version for storage - exclude large data that can be regenerated
    const stateToSave = {
      ...state,
      version: STORAGE_VERSION,
      tabs: state.tabs.map(tab => ({
        ...tab,
        isLoading: false, // Don't persist loading state
        results: [], // Don't store search results - they can be regenerated
        pairings: [], // Don't store pairings - they can be regenerated
        linkings: [], // Don't store linkings - they can be regenerated
        error: '', // Don't persist errors
        // Keep pairingsGraphState and linkingGraphState - these are user selections that can't be regenerated
      })),
    };
    
    const serialized = JSON.stringify(stateToSave);
    
    // Check if the serialized data is too large
    const storageInfo = DevStorageHelper.getStorageUsage();
    const estimatedNewSize = storageInfo.used + serialized.length;
    const maxSafeSize = 4 * 1024 * 1024; // 4MB conservative limit
    
    if (estimatedNewSize > maxSafeSize || serialized.length > 2 * 1024 * 1024) { // 2MB per state (increased from 1MB)
      console.warn('Tab state too large for localStorage, using minimal state');
      // Save only essential data
      const minimalState = {
        tabs: state.tabs.slice(-3).map(tab => ({ // Keep only last 3 tabs
          id: tab.id,
          name: tab.name,
          searchTerms: tab.searchTerms,
          pairingsSearchTerms: tab.pairingsSearchTerms,
          selectedTestament: tab.selectedTestament,
          selectedBooks: tab.selectedBooks,
          maxProximity: tab.maxProximity,
          activeTab: tab.activeTab,
          isDarkMode: tab.isDarkMode,
          showGraph: tab.showGraph,
          showFilters: tab.showFilters,
          // Keep user selections even in minimal state - these are important
          pairingsGraphState: tab.pairingsGraphState || {
            selectedConnections: [],
            selectedNodes: [],
            graphTransform: { x: 0, y: 0, scale: 1 },
          },
          linkingGraphState: tab.linkingGraphState || {
            selectedConnections: [],
            selectedNodes: [],
            graphTransform: { x: 0, y: 0, scale: 1 },
          },
          results: [],
          pairings: [],
          linkings: [],
          isLoading: false,
          error: '',
          lastSearchKey: '',
          filterCounts: {
            total: 0,
            oldTestament: 0,
            newTestament: 0,
            books: {},
          },
        })),
        activeTabId: state.activeTabId,
        isInitialized: state.isInitialized,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));
    } else {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (error) {
    console.error('Failed to save tab state to localStorage:', error);
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      try {
        // Cleanup and try with minimal state
        DevStorageHelper.cleanupOldData();
        localStorage.removeItem(STORAGE_KEY);
        
        // Try to preserve at least the current tab's user selections
        const currentTab = state.tabs.find(tab => tab.id === state.activeTabId);
        const emergencyState = {
          tabs: [{
            id: state.activeTabId,
            name: currentTab?.name || 'Search 1',
            ...DEFAULT_TAB_STATE,
            // Preserve user selections if possible
            pairingsGraphState: currentTab?.pairingsGraphState || {
              selectedConnections: [],
              selectedNodes: [],
              graphTransform: { x: 0, y: 0, scale: 1 },
            },
            linkingGraphState: currentTab?.linkingGraphState || {
              selectedConnections: [],
              selectedNodes: [],
              graphTransform: { x: 0, y: 0, scale: 1 },
            },
            isDarkMode: currentTab?.isDarkMode || false,
            showGraph: currentTab?.showGraph || false,
          }],
          activeTabId: state.activeTabId,
          isInitialized: true,
          version: STORAGE_VERSION,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emergencyState));
        console.warn('Saved emergency minimal state due to quota exceeded');
      } catch (retryError) {
        console.error('Failed to save even minimal state:', retryError);
        // Clear localStorage entirely if we can't save anything
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (clearError) {
          console.error('Failed to clear localStorage:', clearError);
        }
      }
    }
  } finally {
    pendingState = null;
  }
  }, 100);
}

function tabReducer(state: TabReducerState, action: TabAction): TabReducerState {
  switch (action.type) {
    case 'INITIALIZE': {
      const newState = {
        tabs: action.payload.tabs,
        activeTabId: action.payload.activeTabId,
        isInitialized: true,
        version: STORAGE_VERSION,
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'ADD_TAB': {
      if (state.tabs.length >= MAX_TABS) {
        return state;
      }

      const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
      const newTab: TabState = {
        id: generateTabId(),
        name: action.payload.name || `Search ${state.tabs.length + 1}`,
        ...DEFAULT_TAB_STATE,
        // Inherit dark mode and graph visibility from current active tab
        isDarkMode: activeTab?.isDarkMode || false,
        showGraph: activeTab?.showGraph || false,
      };

      const newState = {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'REMOVE_TAB': {
      if (state.tabs.length <= 1) {
        return state;
      }

      const tabIndex = state.tabs.findIndex(tab => tab.id === action.payload.tabId);
      if (tabIndex === -1) {
        return state;
      }

      const newTabs = state.tabs.filter(tab => tab.id !== action.payload.tabId);
      let newActiveTabId = state.activeTabId;

      if (state.activeTabId === action.payload.tabId) {
        const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
        newActiveTabId = newTabs[newActiveIndex].id;
      }

      const newState = {
        ...state,
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'SWITCH_TAB': {
      if (!state.tabs.find(tab => tab.id === action.payload.tabId)) {
        return state;
      }

      const newState = {
        ...state,
        activeTabId: action.payload.tabId,
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'RENAME_TAB': {
      const newState = {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? { ...tab, name: action.payload.name.trim() || 'Untitled' }
            : tab
        ),
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'DUPLICATE_TAB': {
      if (state.tabs.length >= MAX_TABS) {
        return state;
      }

      const sourceTab = state.tabs.find(tab => tab.id === action.payload.tabId);
      if (!sourceTab) {
        return state;
      }

      const newTab: TabState = {
        ...sourceTab,
        id: generateTabId(),
        name: `${sourceTab.name} Copy`,
      };

      const newState = {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'UPDATE_SEARCH_TERMS': {
      const newState = {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { 
                ...tab, 
                searchTerms: action.payload.searchTerms,
                pairingsSearchTerms: action.payload.pairingsSearchTerms,
              }
            : tab
        ),
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'UPDATE_FILTERS': {
      const newState = {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { 
                ...tab, 
                selectedTestament: action.payload.selectedTestament,
                selectedBooks: action.payload.selectedBooks,
                maxProximity: action.payload.maxProximity,
              }
            : tab
        ),
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'UPDATE_UI_STATE': {
      const newState = {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { ...tab, ...action.payload }
            : tab
        ),
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'UPDATE_GRAPH_STATE': {
      const { tabType, selectedConnections, selectedNodes, graphTransform } = action.payload;
      const newState = {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { 
                ...tab, 
                [tabType === 'pairings' ? 'pairingsGraphState' : 'linkingGraphState']: {
                  ...tab[tabType === 'pairings' ? 'pairingsGraphState' : 'linkingGraphState'],
                  ...(selectedConnections !== undefined && { selectedConnections }),
                  ...(selectedNodes !== undefined && { selectedNodes }),
                  ...(graphTransform !== undefined && { graphTransform }),
                }
              }
            : tab
        ),
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'SET_SEARCH_LOADING': {
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { ...tab, isLoading: action.payload.isLoading, error: '' }
            : tab
        ),
      };
    }

    case 'SET_SEARCH_RESULTS': {
      const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
      if (!activeTab) return state;

      const searchKey = generateSearchKey(activeTab);
      const newState = {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { 
                ...tab, 
                results: action.payload.results,
                pairings: action.payload.pairings,
                linkings: action.payload.linkings,
                isLoading: false,
                error: action.payload.error || '',
                lastSearchKey: searchKey,
              }
            : tab
        ),
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'SET_SEARCH_ERROR': {
      const newState = {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { ...tab, error: action.payload.error, isLoading: false }
            : tab
        ),
      };
      saveStateToStorage(newState);
      return newState;
    }

    case 'UPDATE_FILTER_COUNTS': {
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === state.activeTabId
            ? { ...tab, filterCounts: action.payload.filterCounts }
            : tab
        ),
      };
    }

    default:
      return state;
  }
}

export function useTabReducer() {
  const [state, dispatch] = useReducer(tabReducer, createDefaultState());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  const [parserLoaded, setParserLoaded] = useState(false);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Get current active tab
  const activeTab = state.tabs.find(tab => tab.id === state.activeTabId) || state.tabs[0];

  // Function to calculate filter counts
  const calculateFilterCounts = useCallback((searchTerms: string) => {
    if (!SearchStateValidator.canPerformSearch(searchTerms) || !kjvParser.isLoaded()) {
      return {
        total: 0,
        oldTestament: 0,
        newTestament: 0,
        books: {},
      };
    }

    const terms = SearchTermProcessor.processSearchString(searchTerms);

    // Calculate total results
    const totalResults = kjvParser.searchWords(terms, {});

    // Calculate testament counts
    const oldTestamentResults = kjvParser.searchWords(terms, { testament: 'old' });
    const newTestamentResults = kjvParser.searchWords(terms, { testament: 'new' });

    // Calculate book counts
    const bookCounts: Record<string, number> = {};
    const allBooks = [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
    allBooks.forEach((book) => {
      const bookResults = kjvParser.searchWords(terms, { books: [book] });
      bookCounts[book] = bookResults.length;
    });

    return {
      total: totalResults.length,
      oldTestament: oldTestamentResults.length,
      newTestament: newTestamentResults.length,
      books: bookCounts,
    };
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    const loadedState = loadStateFromStorage();
    if (loadedState.tabs.length > 0) {
      dispatch({
        type: 'INITIALIZE',
        payload: {
          tabs: loadedState.tabs,
          activeTabId: loadedState.activeTabId,
        },
      });
    }
  }, []);

  // Track when parser becomes loaded
  useEffect(() => {
    const checkParser = () => {
      if (kjvParser.isLoaded() && !parserLoaded) {
        setParserLoaded(true);
      }
    };
    
    // Check immediately
    checkParser();
    
    // Check periodically until loaded
    const interval = setInterval(checkParser, 100);
    
    return () => clearInterval(interval);
  }, [parserLoaded]);

  // Search function that updates results in the reducer
  const performSearch = useCallback(async (tabId?: string, immediate = false) => {
    // Get fresh tab data from current state ref to avoid stale closures
    const currentState = stateRef.current;
    const currentActiveTab = currentState.tabs.find(tab => tab.id === currentState.activeTabId) || currentState.tabs[0];
    const targetTab = tabId ? currentState.tabs.find(tab => tab.id === tabId) : currentActiveTab;
    
    if (!targetTab || !kjvParser.isLoaded()) return;

    const searchKey = generateSearchKey(targetTab);
    
    // Skip search if already performed for this configuration
    if (targetTab.lastSearchKey === searchKey && 
        (targetTab.results.length > 0 || targetTab.pairings.length > 0 || targetTab.error)) {
      return;
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const executeSearch = async () => {
      // Check if we can perform search
      if (!SearchStateValidator.canPerformSearch(targetTab.searchTerms)) {
        // Only dispatch if we need to clear existing results
        if (targetTab.results.length > 0 || targetTab.pairings.length > 0 || targetTab.error) {
          dispatch({
            type: 'SET_SEARCH_RESULTS',
            payload: { results: [], pairings: [], linkings: [], error: '' },
          });
        }
        return;
      }

      dispatch({ type: 'SET_SEARCH_LOADING', payload: { isLoading: true } });

      try {
        const terms = SearchTermProcessor.processSearchString(targetTab.searchTerms);
        const searchFilters = {
          ...(targetTab.selectedTestament !== 'all' && { testament: targetTab.selectedTestament }),
          ...(targetTab.selectedBooks.length > 0 && { books: targetTab.selectedBooks }),
          ...(targetTab.maxProximity !== APP_CONFIG.PAIRINGS.MAX_PROXIMITY && { maxProximity: targetTab.maxProximity }),
        };

        const searchResults = kjvParser.searchWords(terms, searchFilters);

        let versePairings: VersePairing[] = [];
        let verseLinkings: VersePairing[] = [];
        
        // Always calculate linkings (internal pairings within main search terms)
        verseLinkings = kjvParser.findVersePairings(terms, searchFilters);
        
        // Always calculate pairings (between two search groups if both exist)
        const { mainTerms, pairingsTerms, hasValidMain, hasValidPairings } = 
          SearchTermProcessor.processBothSearchStrings(targetTab.searchTerms, targetTab.pairingsSearchTerms);

        if (hasValidMain && hasValidPairings) {
          // Calculate pairings between the two search groups
          versePairings = kjvParser.findVersePairingsBetweenGroups(mainTerms, pairingsTerms, searchFilters);
        } else {
          // If no valid pairings search terms, pairings will be empty
          versePairings = [];
        }

        versePairings = versePairings.sort((a, b) => {
          if (a.proximity !== b.proximity) {
            return a.proximity - b.proximity;
          }
          return a.verses[0].position - b.verses[0].position;
        });

        verseLinkings = verseLinkings.sort((a, b) => {
          if (a.proximity !== b.proximity) {
            return a.proximity - b.proximity;
          }
          return a.verses[0].position - b.verses[0].position;
        });

        console.log(`Search completed for tab ${targetTab.activeTab}:`, {
          results: searchResults.length,
          pairings: versePairings.length,
          linkings: verseLinkings.length
        });

        dispatch({
          type: 'SET_SEARCH_RESULTS',
          payload: { results: searchResults, pairings: versePairings, linkings: verseLinkings },
        });
      } catch (err) {
        console.error('Search failed:', err);
        dispatch({
          type: 'SET_SEARCH_ERROR',
          payload: { error: 'Search failed. Please try again.' },
        });
      }
    };

    if (immediate) {
      await executeSearch();
    } else {
      // Debounce search for typing
      searchTimeoutRef.current = setTimeout(executeSearch, APP_CONFIG.SEARCH.DEBOUNCE_DELAY);
    }
  }, []); // Keep empty dependencies but use ref for current state

  // Update filter counts when search terms change or when parser loads
  useEffect(() => {
    if (state.isInitialized && activeTab && parserLoaded && activeTab.searchTerms) {
      const newFilterCounts = calculateFilterCounts(activeTab.searchTerms);
      
      // Only update if counts have actually changed or if current counts are empty (after load)
      const currentCounts = activeTab.filterCounts;
      const countsAreEmpty = currentCounts.total === 0 && 
        currentCounts.oldTestament === 0 && 
        currentCounts.newTestament === 0 && 
        Object.keys(currentCounts.books).length === 0;
      
      const hasChanged = 
        currentCounts.total !== newFilterCounts.total ||
        currentCounts.oldTestament !== newFilterCounts.oldTestament ||
        currentCounts.newTestament !== newFilterCounts.newTestament ||
        JSON.stringify(currentCounts.books) !== JSON.stringify(newFilterCounts.books);
      
      if (hasChanged || countsAreEmpty) {
        dispatch({
          type: 'UPDATE_FILTER_COUNTS',
          payload: { filterCounts: newFilterCounts },
        });
      }
    }
  }, [state.isInitialized, activeTab?.id, activeTab?.searchTerms, parserLoaded, calculateFilterCounts]);

  // Auto-trigger search for active tab if it has search terms but no results
  useEffect(() => {
    if (state.isInitialized && activeTab && activeTab.searchTerms && 
        !activeTab.isLoading && !activeTab.results.length && !activeTab.error) {
      // Small delay to ensure kjvParser is loaded
      const timer = setTimeout(() => {
        performSearch(activeTab.id, true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.isInitialized, activeTab?.id, activeTab?.searchTerms, performSearch]);

  // Action creators
  const actions = {
    addTab: (name?: string) => dispatch({ type: 'ADD_TAB', payload: { name } }),
    removeTab: (tabId: string) => dispatch({ type: 'REMOVE_TAB', payload: { tabId } }),
    switchTab: (tabId: string) => dispatch({ type: 'SWITCH_TAB', payload: { tabId } }),
    renameTab: (tabId: string, name: string) => dispatch({ type: 'RENAME_TAB', payload: { tabId, name } }),
    duplicateTab: (tabId: string) => dispatch({ type: 'DUPLICATE_TAB', payload: { tabId } }),
    
    updateSearchTerms: (searchTerms: string, pairingsSearchTerms: string) => 
      dispatch({ type: 'UPDATE_SEARCH_TERMS', payload: { searchTerms, pairingsSearchTerms } }),
    
    updateFilters: (selectedTestament: 'all' | 'old' | 'new', selectedBooks: string[], maxProximity: number) =>
      dispatch({ type: 'UPDATE_FILTERS', payload: { selectedTestament, selectedBooks, maxProximity } }),
    
    updateUIState: (updates: { showFilters?: boolean; activeTab?: 'all' | 'pairings' | 'linking'; isDarkMode?: boolean; showGraph?: boolean }) =>
      dispatch({ type: 'UPDATE_UI_STATE', payload: updates }),
    
    updateGraphState: (tabType: 'pairings' | 'linking', updates: { selectedConnections?: Array<{ word1: string; word2: string; reference: string; versePositions: number[]; }>; selectedNodes?: string[]; graphTransform?: { x: number; y: number; scale: number; } }) =>
      dispatch({ type: 'UPDATE_GRAPH_STATE', payload: { tabType, ...updates } }),
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    activeTab,
    actions,
    performSearch,
  };
}