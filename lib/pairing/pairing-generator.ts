import { Verse, VersePairing } from '../types/verse';
import { SearchUtils } from '../search/search-utils';
import { APP_CONFIG } from '../constants';

// Use centralized configuration
const CONFIG = {
  MAX_SEARCH_TERMS: APP_CONFIG.SEARCH.MAX_SEARCH_TERMS,
  MAX_SEARCH_TERMS_PER_GROUP: APP_CONFIG.SEARCH.MAX_SEARCH_TERMS_PER_GROUP,
  MAX_PAIRINGS_PER_TERM_PAIR: APP_CONFIG.PAIRINGS.MAX_PAIRINGS_PER_TERM_PAIR,
  MAX_PROXIMITY: APP_CONFIG.PAIRINGS.MAX_PROXIMITY,
  MIN_TERM_LENGTH: APP_CONFIG.SEARCH.MIN_TERM_LENGTH,
  // Streaming configuration
  CHUNK_SIZE: 50, // Process this many term pairs before yielding
  MAX_PROCESSING_TIME: 100, // Max milliseconds before yielding control
} as const;

export class PairingGenerator {
  static findPairingsForTerms(
    term1: string,
    term2: string,
    verses1: Verse[],
    verses2: Verse[],
    isBetweenGroups: boolean = false
  ): VersePairing[] {
    const pairings: VersePairing[] = [];
    const processedPairs = new Set<string>();

    console.log(`findPairingsForTerms: ${term1} (${verses1.length} verses) ↔ ${term2} (${verses2.length} verses)`);

    // Find same-verse pairings
    const commonVerses = verses1.filter((v1) =>
      verses2.some((v2) => v1.position === v2.position)
    );

    console.log(`Found ${commonVerses.length} common verses for ${term1} ↔ ${term2}`);

    for (const verse of commonVerses) {
      const pairingKey = `same-${verse.position}-${term1}-${term2}`;
      if (!processedPairs.has(pairingKey)) {
        pairings.push({
          verses: [verse],
          term1,
          term2,
          proximity: 0,
          isBetweenGroups,
        });
        processedPairs.add(pairingKey);
      }
    }

    // Find proximity pairings
    let proximityPairings = 0;
    for (const verse1 of verses1) {
      for (const verse2 of verses2) {
        if (verse1.position === verse2.position) continue;

        const distance = Math.abs(verse1.position - verse2.position);
        if (distance <= CONFIG.MAX_PROXIMITY) {
          const minPos = Math.min(verse1.position, verse2.position);
          const maxPos = Math.max(verse1.position, verse2.position);
          const pairingKey = `pair-${minPos}-${maxPos}-${term1}-${term2}`;

          if (!processedPairs.has(pairingKey)) {
            pairings.push({
              verses: [verse1, verse2].sort((a, b) => a.position - b.position),
              term1,
              term2,
              proximity: distance,
              isBetweenGroups,
            });
            processedPairs.add(pairingKey);
            proximityPairings++;

            if (proximityPairings >= CONFIG.MAX_PAIRINGS_PER_TERM_PAIR) {
              break;
            }
          }
        }
      }
      if (proximityPairings >= CONFIG.MAX_PAIRINGS_PER_TERM_PAIR) {
        break;
      }
    }

    return pairings;
  }

  static async generateAllPairingsAsync(
    termToVerses: Map<string, Verse[]>,
    isBetweenGroups: boolean = false,
    onProgress?: (processed: number, total: number, pairings: number) => void
  ): Promise<VersePairing[]> {
    const pairings: VersePairing[] = [];
    const processedPairings = new Set<string>();
    const termArray = Array.from(termToVerses.keys());

    console.log('generateAllPairingsAsync called with terms:', termArray);
    console.log('Term to verses mapping:', 
      Array.from(termToVerses.entries()).map(([term, verses]) => ({
        term,
        verseCount: verses.length,
        sampleVerses: verses.slice(0, 3).map(v => v.reference)
      }))
    );

    // Create term pairs with priority scoring
    const termPairs: Array<{
      i: number;
      j: number;
      term1: string;
      term2: string;
      priority: number;
    }> = [];

    for (let i = 0; i < termArray.length; i++) {
      for (let j = i + 1; j < termArray.length; j++) {
        const term1 = termArray[i];
        const term2 = termArray[j];

        if (SearchUtils.areTermsSameWord(term1, term2)) continue;

        const verses1 = termToVerses.get(term1) || [];
        const verses2 = termToVerses.get(term2) || [];

        // Same priority logic as between-groups
        const priority =
          Math.min(verses1.length, verses2.length) *
          Math.max(1, 100 - Math.abs(verses1.length - verses2.length));

        termPairs.push({ i, j, term1, term2, priority });
      }
    }

    console.log('Generated term pairs for processing:', termPairs.map(tp => `${tp.term1} ↔ ${tp.term2}`));

    // Sort by priority (highest first)
    termPairs.sort((a, b) => b.priority - a.priority);

    let processedCount = 0;
    let startTime = Date.now();

    for (const { term1, term2 } of termPairs) {
      processedCount++;

      // Yield control periodically to prevent blocking
      if (
        processedCount % CONFIG.CHUNK_SIZE === 0 ||
        Date.now() - startTime > CONFIG.MAX_PROCESSING_TIME
      ) {
        if (onProgress) {
          onProgress(processedCount, termPairs.length, pairings.length);
        }

        // Yield control back to the browser
        await new Promise((resolve) => setTimeout(resolve, 0));
        startTime = Date.now();
      }

      const verses1 = termToVerses.get(term1) || [];
      const verses2 = termToVerses.get(term2) || [];

      const termPairings = PairingGenerator.findPairingsForTerms(
        term1,
        term2,
        verses1,
        verses2,
        isBetweenGroups
      );

      if (termPairings.length > 0) {
        console.log(`Found ${termPairings.length} pairings for ${term1} ↔ ${term2}`);
      }

      for (const pairing of termPairings) {
        const pairingKey = PairingGenerator.createPairingKey(
          pairing,
          term1,
          term2
        );

        if (!processedPairings.has(pairingKey)) {
          pairings.push(pairing);
          processedPairings.add(pairingKey);
        }
      }
    }

    if (onProgress) {
      onProgress(termPairs.length, termPairs.length, pairings.length);
    }
    console.log(
      `Completed processing ${termPairs.length} term pairs, found ${pairings.length} verse pairings.`
    );
    return PairingGenerator.consolidatePairings(pairings, termToVerses);
  }

  static async generateBetweenGroupsPairingsAsync(
    group1Terms: string[],
    group2Terms: string[],
    termToVerses: Map<string, Verse[]>,
    onProgress?: (processed: number, total: number, pairings: number) => void
  ): Promise<VersePairing[]> {
    const pairings: VersePairing[] = [];
    const processedPairings = new Set<string>();

    // Create term pairs with priority scoring based on verse counts
    const termPairs: Array<{ term1: string; term2: string; priority: number }> =
      [];

    for (const term1 of group1Terms) {
      for (const term2 of group2Terms) {
        if (SearchUtils.areTermsSameWord(term1, term2)) continue;

        const verses1 = termToVerses.get(term1) || [];
        const verses2 = termToVerses.get(term2) || [];

        // Priority: favor pairs where both terms have moderate verse counts
        // Too many verses = too common, too few = too rare
        const priority =
          Math.min(verses1.length, verses2.length) *
          Math.max(1, 100 - Math.abs(verses1.length - verses2.length));

        termPairs.push({ term1, term2, priority });
      }
    }

    // Sort by priority (highest first) to process most promising pairs first
    termPairs.sort((a, b) => b.priority - a.priority);

    let processedCount = 0;
    let startTime = Date.now();

    for (const { term1, term2 } of termPairs) {
      processedCount++;

      // Yield control periodically to prevent blocking
      if (
        processedCount % CONFIG.CHUNK_SIZE === 0 ||
        Date.now() - startTime > CONFIG.MAX_PROCESSING_TIME
      ) {
        if (onProgress) {
          onProgress(processedCount, termPairs.length, pairings.length);
        }

        // Yield control back to the browser
        await new Promise((resolve) => setTimeout(resolve, 0));
        startTime = Date.now();
      }

      const verses1 = termToVerses.get(term1) || [];
      const verses2 = termToVerses.get(term2) || [];

      const termPairings = PairingGenerator.findPairingsForTerms(
        term1,
        term2,
        verses1,
        verses2,
        true
      );

      for (const pairing of termPairings) {
        const pairingKey = PairingGenerator.createPairingKey(
          pairing,
          term1,
          term2
        );

        if (!processedPairings.has(pairingKey)) {
          pairings.push(pairing);
          processedPairings.add(pairingKey);
        }
      }
    }

    if (onProgress) {
      onProgress(termPairs.length, termPairs.length, pairings.length);
    }
    console.log(
      `Completed processing ${termPairs.length} term pairs, found ${pairings.length} verse pairings.`
    );
    return PairingGenerator.consolidatePairings(pairings, termToVerses, group1Terms, group2Terms);
  }



  private static createPairingKey(
    pairing: VersePairing,
    term1: string,
    term2: string
  ): string {
    if (pairing.proximity === 0) {
      return `same-${pairing.verses[0].position}-${term1}-${term2}`;
    }

    const positions = pairing.verses.map((v) => v.position);
    return `pair-${Math.min(...positions)}-${Math.max(
      ...positions
    )}-${term1}-${term2}`;
  }

  // Consolidate pairings that share verses but have different word combinations
  static consolidatePairings(pairings: VersePairing[], termToVerses?: Map<string, Verse[]>, group1Terms?: string[], group2Terms?: string[]): VersePairing[] {
    console.log('consolidatePairings called with', pairings.length, 'pairings');

    const verseGroupMap = new Map<string, VersePairing[]>();

    // Group pairings by their verse positions
    for (const pairing of pairings) {
      const verseKey = pairing.verses
        .map((v) => v.position)
        .sort((a, b) => a - b)
        .join(',');
      if (!verseGroupMap.has(verseKey)) {
        verseGroupMap.set(verseKey, []);
      }
      verseGroupMap.get(verseKey)!.push(pairing);
    }

    console.log(
      'Verse groups:',
      Array.from(verseGroupMap.entries()).map(([key, pairings]) => ({
        verseKey: key,
        pairingCount: pairings.length,
        pairings: pairings.map((p) => `${p.term1} ↔ ${p.term2}`),
      }))
    );

    const consolidatedPairings: VersePairing[] = [];

    // Process each verse group
    for (const [, groupPairings] of verseGroupMap) {
      const firstPairing = groupPairings[0];
      
      // Collect all unique terms that appear in these verses
      const allTermsSet = new Set<string>();
      
      // Add all terms from all pairings in this group
      for (const pairing of groupPairings) {
        allTermsSet.add(pairing.term1);
        allTermsSet.add(pairing.term2);
      }
      
      // If we have access to the full term-to-verses mapping, find ALL search terms in these verses
      if (termToVerses) {
        const versePositions = new Set(firstPairing.verses.map(v => v.position));
        
        // Check each search term to see if it appears in any of these verses
        for (const [term, verses] of termToVerses) {
          const termAppearsInTheseVerses = verses.some(v => versePositions.has(v.position));
          if (termAppearsInTheseVerses) {
            allTermsSet.add(term);
          }
        }
      }
      
      // Convert terms set to array for easier processing
      const allTerms = Array.from(allTermsSet);
      
      // Generate valid term pairs based on the pairing type
      const validPairs: string[] = [];
      const pairSet = new Set<string>(); // Track pairs to avoid duplicates
      
      if (firstPairing.isBetweenGroups && group1Terms && group2Terms) {
        // For between-groups pairings, only create pairs between different groups
        const group1Set = new Set(group1Terms);
        const group2Set = new Set(group2Terms);
        
        for (const term1 of allTerms) {
          for (const term2 of allTerms) {
            if (term1 !== term2) {
              // Only create pairs between different groups
              const term1InGroup1 = group1Set.has(term1);
              const term1InGroup2 = group2Set.has(term1);
              const term2InGroup1 = group1Set.has(term2);
              const term2InGroup2 = group2Set.has(term2);
              
              // Valid if one term is in group1 and the other is in group2
              if ((term1InGroup1 && term2InGroup2) || (term1InGroup2 && term2InGroup1)) {
                // Ensure consistent ordering to avoid duplicates (alphabetical)
                const [first, second] = [term1, term2].sort();
                const pairKey = `${first}↔${second}`;
                
                if (!pairSet.has(pairKey)) {
                  pairSet.add(pairKey);
                  validPairs.push(`${first} ↔ ${second}`);
                }
              }
            }
          }
        }
      } else {
        // For within-group pairings, create all possible pairs
        for (let i = 0; i < allTerms.length; i++) {
          for (let j = i + 1; j < allTerms.length; j++) {
            // Already in correct order (i < j), so no duplicates possible
            const pair = `${allTerms[i]} ↔ ${allTerms[j]}`;
            validPairs.push(pair);
          }
        }
      }
      
      console.log(`Verse group has ${allTerms.length} unique terms: [${allTerms.join(', ')}]`);
      console.log(`Generated ${validPairs.length} valid term pairs: [${validPairs.join(', ')}]`);

      // Create consolidated pairing with valid term pairs
      const consolidatedPairing: VersePairing = {
        verses: firstPairing.verses,
        term1: firstPairing.term1,
        term2: firstPairing.term2,
        proximity: firstPairing.proximity,
        isBetweenGroups: firstPairing.isBetweenGroups,
        allTermPairs: validPairs.length > 0 ? validPairs : [`${firstPairing.term1} ↔ ${firstPairing.term2}`],
      };

      consolidatedPairings.push(consolidatedPairing);
    }

    console.log(
      `Consolidated ${pairings.length} pairings into ${consolidatedPairings.length} consolidated pairings`
    );
    return consolidatedPairings;
  }
}
