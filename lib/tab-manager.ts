export interface TabState {
  id: string;
  name: string;
  searchTerms: string;
  pairingsSearchTerms: string;
  selectedTestament: 'all' | 'old' | 'new';
  selectedBooks: string[];
  showFilters: boolean;
  activeTab: 'all' | 'pairings';
  scrollPosition: number;
  isDarkMode: boolean;
  showGraph: boolean;
  selectedConnections: Array<{
    word1: string;
    word2: string;
    reference: string;
    versePositions: number[]; // Array of verse positions to uniquely identify this pairing
  }>;
}

export interface TabManager {
  tabs: TabState[];
  activeTabId: string;
}

const DEFAULT_TAB_STATE: Omit<TabState, 'id' | 'name'> = {
  searchTerms: '',
  pairingsSearchTerms: '',
  selectedTestament: 'all',
  selectedBooks: [],
  showFilters: false,
  activeTab: 'all',
  scrollPosition: 0,
  isDarkMode: false,
  showGraph: false,
  selectedConnections: [],
};

export class TabManagerService {
  private static readonly STORAGE_KEY = 'kjv-tab-manager';
  private static readonly MAX_TABS = 10;

  static loadTabManager(): TabManager {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      
      return this.createDefaultTabManager();
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      
      if (stored) {
        const parsed = JSON.parse(stored) as TabManager;
        
        
        // Ensure we have at least one tab
        if (parsed.tabs.length === 0) {
          
          return this.createDefaultTabManager();
        }
        
        // Ensure activeTabId exists in tabs
        if (!parsed.tabs.find(tab => tab.id === parsed.activeTabId)) {
          
          parsed.activeTabId = parsed.tabs[0].id;
        }
        
        // Migrate old tab data to include selectedConnections if missing
        parsed.tabs = parsed.tabs.map(tab => ({
          ...tab,
          selectedConnections: (tab.selectedConnections || []).map(conn => ({
            ...conn,
            versePositions: conn.versePositions || [], // Add versePositions for existing connections
          })),
        }));
        
        
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load tab manager from localStorage:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(this.STORAGE_KEY);
        
      } catch (clearError) {
        console.error('Failed to clear corrupted data:', clearError);
      }
    }
    
    
    return this.createDefaultTabManager();
  }

  static saveTabManager(tabManager: TabManager): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Validate tabManager before saving
      if (!tabManager || !tabManager.tabs || tabManager.tabs.length === 0) {
        console.warn('Invalid tab manager, skipping save');
        return;
      }

      const serialized = JSON.stringify(tabManager);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      
    } catch (error) {
      console.error('Failed to save tab manager to localStorage:', error);
      // Try to clear localStorage if it's full
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem(this.STORAGE_KEY);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tabManager));
          
        } catch (retryError) {
          console.error('Failed to save even after clearing:', retryError);
        }
      }
    }
  }

  static createDefaultTabManager(): TabManager {
    const defaultTab: TabState = {
      id: this.generateTabId(),
      name: 'Search 1',
      ...DEFAULT_TAB_STATE,
    };

    return {
      tabs: [defaultTab],
      activeTabId: defaultTab.id,
    };
  }

  static addTab(tabManager: TabManager, name?: string): TabManager {
    if (tabManager.tabs.length >= this.MAX_TABS) {
      return tabManager; // Don't add more tabs if at limit
    }

    const newTab: TabState = {
      id: this.generateTabId(),
      name: name || `Search ${tabManager.tabs.length + 1}`,
      ...DEFAULT_TAB_STATE,
      // Inherit dark mode and graph visibility from current active tab
      isDarkMode: this.getActiveTab(tabManager)?.isDarkMode || false,
      showGraph: this.getActiveTab(tabManager)?.showGraph || false,
      // Don't inherit selectedConnections - each tab should start with empty graph
    };

    const newTabManager = {
      ...tabManager,
      tabs: [...tabManager.tabs, newTab],
      activeTabId: newTab.id,
    };

    this.saveTabManager(newTabManager);
    return newTabManager;
  }

  static removeTab(tabManager: TabManager, tabId: string): TabManager {
    if (tabManager.tabs.length <= 1) {
      return tabManager; // Don't remove the last tab
    }

    const tabIndex = tabManager.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) {
      return tabManager;
    }

    const newTabs = tabManager.tabs.filter(tab => tab.id !== tabId);
    let newActiveTabId = tabManager.activeTabId;

    // If we're removing the active tab, switch to another tab
    if (tabManager.activeTabId === tabId) {
      // Switch to the tab to the left, or the first tab if we're removing the first tab
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
      newActiveTabId = newTabs[newActiveIndex].id;
    }

    const newTabManager = {
      ...tabManager,
      tabs: newTabs,
      activeTabId: newActiveTabId,
    };

    this.saveTabManager(newTabManager);
    return newTabManager;
  }

  static switchTab(tabManager: TabManager, tabId: string): TabManager {
    if (!tabManager.tabs.find(tab => tab.id === tabId)) {
      return tabManager;
    }

    const newTabManager = {
      ...tabManager,
      activeTabId: tabId,
    };

    this.saveTabManager(newTabManager);
    return newTabManager;
  }

  static updateTabState(tabManager: TabManager, tabId: string, updates: Partial<Omit<TabState, 'id'>>): TabManager {
    const newTabs = tabManager.tabs.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    );

    const newTabManager = {
      ...tabManager,
      tabs: newTabs,
    };

    this.saveTabManager(newTabManager);
    return newTabManager;
  }

  static renameTab(tabManager: TabManager, tabId: string, newName: string): TabManager {
    return this.updateTabState(tabManager, tabId, { name: newName.trim() || 'Untitled' });
  }

  static getActiveTab(tabManager: TabManager): TabState | null {
    return tabManager.tabs.find(tab => tab.id === tabManager.activeTabId) || null;
  }

  static duplicateTab(tabManager: TabManager, tabId: string): TabManager {
    if (tabManager.tabs.length >= this.MAX_TABS) {
      return tabManager;
    }

    const sourceTab = tabManager.tabs.find(tab => tab.id === tabId);
    if (!sourceTab) {
      return tabManager;
    }

    const newTab: TabState = {
      ...sourceTab,
      id: this.generateTabId(),
      name: `${sourceTab.name} Copy`,
    };

    const newTabManager = {
      ...tabManager,
      tabs: [...tabManager.tabs, newTab],
      activeTabId: newTab.id,
    };

    this.saveTabManager(newTabManager);
    return newTabManager;
  }

  private static generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}