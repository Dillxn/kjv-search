// In-memory cache for search results to avoid localStorage quota issues
import { SearchResult, VersePairing } from './kjv-parser';

interface CachedSearchResults {
  results: SearchResult[];
  pairings: VersePairing[]; // Keep as pairings for backwards compatibility with cached data
  timestamp: number;
}

class SearchCache {
  private cache = new Map<string, CachedSearchResults>();
  private readonly MAX_CACHE_SIZE = 50; // Limit cache size
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

  // Generate cache key from search parameters
  private generateCacheKey(
    searchTerms: string,
    activeTab: 'all' | 'linking',
    selectedTestament: 'all' | 'old' | 'new',
    selectedBooks: string[],
    maxProximity: number
  ): string {
    const params = {
      searchTerms: searchTerms.trim().toLowerCase(),
      activeTab,
      selectedTestament,
      selectedBooks: selectedBooks.sort(),
      maxProximity,
    };
    return JSON.stringify(params);
  }

  // Get cached results if they exist and are not expired
  get(
    searchTerms: string,
    activeTab: 'all' | 'linking',
    selectedTestament: 'all' | 'old' | 'new',
    selectedBooks: string[],
    maxProximity: number
  ): { results: SearchResult[]; linkings: VersePairing[] } | null {
    const key = this.generateCacheKey(
      searchTerms,
      activeTab,
      selectedTestament,
      selectedBooks,
      maxProximity
    );

    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return {
      results: cached.results,
      linkings: cached.pairings, // Use cached.pairings but return as linkings for backwards compatibility
    };
  }

  // Store results in cache
  set(
    searchTerms: string,
    activeTab: 'all' | 'linking',
    selectedTestament: 'all' | 'old' | 'new',
    selectedBooks: string[],
    maxProximity: number,
    results: SearchResult[],
    linkings: VersePairing[]
  ): void {
    const key = this.generateCacheKey(
      searchTerms,
      activeTab,
      selectedTestament,
      selectedBooks,
      maxProximity
    );

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      results: [...results], // Clone arrays to prevent mutations
      pairings: [...linkings],
      timestamp: Date.now(),
    });
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const searchCache = new SearchCache();

// Cleanup expired entries every 2 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    searchCache.cleanup();
  }, 2 * 60 * 1000);
}