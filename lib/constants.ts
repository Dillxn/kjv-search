// Application Configuration
export const APP_CONFIG = {
  // Search Configuration
  SEARCH: {
    MIN_TERM_LENGTH: 2,
    MAX_SEARCH_TERMS: 8,
    MAX_SEARCH_TERMS_PER_GROUP: 8,
    DEBOUNCE_DELAY: 500,
  },
  
  // Pairing Configuration
  PAIRINGS: {
    MAX_TOTAL_PAIRINGS: 10000,
    MAX_PAIRINGS_PER_TERM_PAIR: 5000,
    MAX_PROXIMITY: 100,
  },
  
  // Tab Management
  TABS: {
    MAX_TABS: 10,
    AUTO_SAVE_DELAY: 300,
  },
  
  // UI Configuration
  UI: {
    CONTAINER_BASE_OFFSET: 180,
    ESTIMATED_ITEM_HEIGHT: 60,
    DEV_BACKUP_INTERVAL: 2000,
  },
} as const;

// Color schemes for highlighting search terms
export const HIGHLIGHT_COLORS_LIGHT = [
  'bg-yellow-200 text-yellow-900',
  'bg-blue-200 text-blue-900',
  'bg-green-200 text-green-900',
  'bg-red-200 text-red-900',
  'bg-purple-200 text-purple-900',
  'bg-pink-200 text-pink-900',
  'bg-indigo-200 text-indigo-900',
  'bg-orange-200 text-orange-900',
];

export const HIGHLIGHT_COLORS_DARK = [
  'bg-yellow-300 text-yellow-900',
  'bg-blue-300 text-blue-900',
  'bg-green-300 text-green-900',
  'bg-red-300 text-red-900',
  'bg-purple-300 text-purple-900',
  'bg-pink-300 text-pink-900',
  'bg-indigo-300 text-indigo-900',
  'bg-orange-300 text-orange-900',
];

// Separate colors for pairings search (second search box)
export const PAIRINGS_HIGHLIGHT_COLORS_LIGHT = [
  'border-teal-500 text-teal-700 bg-transparent',
  'border-cyan-500 text-cyan-700 bg-transparent',
  'border-lime-500 text-lime-700 bg-transparent',
  'border-amber-500 text-amber-700 bg-transparent',
  'border-rose-500 text-rose-700 bg-transparent',
  'border-violet-500 text-violet-700 bg-transparent',
  'border-emerald-500 text-emerald-700 bg-transparent',
  'border-sky-500 text-sky-700 bg-transparent',
];

export const PAIRINGS_HIGHLIGHT_COLORS_DARK = [
  'border-teal-400 text-teal-300 bg-transparent',
  'border-cyan-400 text-cyan-300 bg-transparent',
  'border-lime-400 text-lime-300 bg-transparent',
  'border-amber-400 text-amber-300 bg-transparent',
  'border-rose-400 text-rose-300 bg-transparent',
  'border-violet-400 text-violet-300 bg-transparent',
  'border-emerald-400 text-emerald-300 bg-transparent',
  'border-sky-400 text-sky-300 bg-transparent',
];