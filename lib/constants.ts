// Application Configuration
export const APP_CONFIG = {
  // Search Configuration
  SEARCH: {
    MIN_TERM_LENGTH: 2,
    MAX_SEARCH_TERMS: Infinity,
    MAX_SEARCH_TERMS_PER_GROUP: Infinity,
    DEBOUNCE_DELAY: 500,
  },
  
  // Pairing Configuration
  PAIRINGS: {
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
    // Standardized spacing - Gap-based approach
    SPACING: {
      GAP: 'gap-2', // 0.5rem/8px - standard gap for flexbox/grid layouts
      GAP_SM: 'gap-1', // 0.25rem/4px - small gap for tight spaces
      PADDING: 'p-2', // 0.5rem/8px - standard padding for containers
      SPACE_Y: 'space-y-2', // 0.5rem/8px - vertical spacing (legacy, prefer gap)
      SPACE_Y_SM: 'space-y-1', // 0.25rem/4px - small vertical spacing (legacy)
    },
  },
} as const;

// Color schemes for highlighting search terms - maximum contrast and distinction
export const HIGHLIGHT_COLORS_LIGHT = [
  'bg-red-500 text-white',         // 1. Bright red (strong contrast)
  'bg-emerald-500 text-white',      // 2. Bright emerald green
  'bg-amber-500 text-white',        // 3. Rich amber (white text for consistency)
  'bg-purple-500 text-white',       // 4. Vibrant purple
  'bg-pink-500 text-white',         // 5. Hot pink
  'bg-orange-500 text-white',       // 6. Bright orange
  'bg-cyan-500 text-white',         // 7. Bright cyan (white text for consistency)
  'bg-lime-500 text-white',         // 8. Electric lime (white text for consistency)
  'bg-indigo-500 text-white',       // 9. Deep indigo
  'bg-rose-500 text-white',         // 10. Rich rose
  'bg-sky-500 text-white',          // 11. Bright sky blue
  'bg-teal-500 text-white',         // 12. Bright teal
  'bg-violet-500 text-white',       // 13. Electric violet
  'bg-yellow-500 text-white',       // 14. Bright yellow (white text for consistency)
  'bg-orange-600 text-white',       // 15. Deeper orange (replaces gray)
  'bg-green-500 text-white',        // 16. Bright green
  'bg-blue-500 text-white',         // 17. Bright blue
  'bg-fuchsia-500 text-white',      // 18. Hot fuchsia
  'bg-purple-600 text-white',       // 19. Deeper purple (replaces stone)
  'bg-pink-600 text-white',         // 20. Deeper pink (replaces neutral)
  'bg-red-600 text-white',          // 21. Deeper red (replaces zinc)
  'bg-yellow-600 text-white',       // 22. Deeper yellow
  'bg-lime-600 text-white',         // 23. Deeper lime
  'bg-cyan-600 text-white',         // 24. Deeper cyan
  'bg-sky-700 text-white',          // 25. Darker sky blue
  'bg-indigo-700 text-white',       // 26. Darker indigo
  'bg-purple-700 text-white',       // 27. Darker purple
  'bg-pink-700 text-white',         // 28. Darker pink
  'bg-red-700 text-white',          // 29. Darker red
];

export const HIGHLIGHT_COLORS_DARK = [
  'bg-red-600 text-white',         // 1. Bright red (even brighter)
  'bg-emerald-600 text-white',      // 2. Bright emerald green
  'bg-amber-600 text-white',        // 3. Rich amber (white text for consistency)
  'bg-purple-600 text-white',       // 4. Vibrant purple
  'bg-pink-600 text-white',         // 5. Hot pink
  'bg-orange-600 text-white',       // 6. Bright orange
  'bg-cyan-600 text-white',         // 7. Bright cyan (white text for consistency)
  'bg-lime-600 text-white',         // 8. Electric lime (white text for consistency)
  'bg-indigo-600 text-white',       // 9. Deep indigo
  'bg-rose-600 text-white',         // 10. Rich rose
  'bg-sky-600 text-white',          // 11. Bright sky blue
  'bg-teal-600 text-white',         // 12. Bright teal
  'bg-violet-600 text-white',       // 13. Electric violet
  'bg-yellow-600 text-white',       // 14. Bright yellow (white text for consistency)
  'bg-orange-700 text-white',       // 15. Deeper orange (replaces gray)
  'bg-green-600 text-white',        // 16. Bright green
  'bg-blue-600 text-white',         // 17. Bright blue
  'bg-fuchsia-600 text-white',      // 18. Hot fuchsia
  'bg-purple-700 text-white',       // 19. Deeper purple (replaces stone)
  'bg-pink-700 text-white',         // 20. Deeper pink (replaces neutral)
  'bg-red-700 text-white',          // 21. Deeper red (replaces zinc)
  'bg-yellow-700 text-white',       // 22. Deeper yellow
  'bg-lime-700 text-white',         // 23. Deeper lime
  'bg-cyan-700 text-white',         // 24. Deeper cyan
  'bg-sky-800 text-white',          // 25. Darker sky blue
  'bg-indigo-800 text-white',       // 26. Darker indigo
  'bg-purple-800 text-white',       // 27. Darker purple
  'bg-pink-800 text-white',         // 28. Darker pink
  'bg-red-800 text-white',          // 29. Darker red
];


// Standardized spacing utilities - Gap-based approach
// Use flexbox/grid with gap instead of margins for consistent spacing:
// - SPACING.GAP (gap-2): Standard 8px gap for flexbox/grid layouts
// - SPACING.GAP_SM (gap-1): Small 4px gap for tight spaces
// - SPACING.PADDING (p-2): Standard 8px padding for containers
// - SPACING.SPACE_Y (space-y-2): Vertical spacing (use only when gap isn't possible)
// - SPACING.SPACE_Y_SM (space-y-1): Small vertical spacing (use only when gap isn't possible)
export const SPACING = APP_CONFIG.UI.SPACING;