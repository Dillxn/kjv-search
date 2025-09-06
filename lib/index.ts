// Main exports
export { KJVParser } from './kjv-parser';

// Type exports
export * from './types/verse';

// Data exports
export * from './data/testament-books';

// Utility exports
export { SearchUtils } from './search/search-utils';
export { FilterUtils } from './search/filter-utils';
export { VerseSearcher } from './search/verse-searcher';
export { PairingGenerator } from './pairing/pairing-generator';

// Singleton instance for backward compatibility
import { KJVParser } from './kjv-parser';
export const kjvParser = new KJVParser();