// Export types
export type { MatchBounds, HighlightConfig, TermColorMap } from './types';

// Export color utilities
export { 
  getHighlightColors, 
  getPairingsHighlightColors,
  createTermColorMaps 
} from './colors';

// Export text formatters
export { 
  formatTextWithColors, 
  formatPairingsTextWithColors 
} from './text-formatters';

// Export unified highlighter (recommended)
export { UnifiedHighlighter } from './unified-highlighter';

// Export legacy highlighters (for backward compatibility)
export { highlightText } from './bounds-highlighter';
export { highlightTextWithRegex } from './regex-highlighter';

// Export regex utilities
export { highlightWithRegex, RegexUtils } from './regex-utils';