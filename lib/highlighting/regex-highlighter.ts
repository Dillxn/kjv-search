import { createTermColorMaps } from './colors';
import { highlightWithRegex } from './regex-utils';

import { RegexUtils } from '../shared/regex-utils';

export function highlightTextWithRegex(
  text: string,
  mainTerms: string[],
  pairingsTerms: string[],
  isDarkMode: boolean
): string {
  console.log('🔍 highlightTextWithRegex called:', {
    textPreview: text.substring(0, 100) + '...',
    mainTerms,
    pairingsTerms,
    isDarkMode
  });

  // Early return if no text or terms
  if (!text || (!mainTerms.length && !pairingsTerms.length)) {
    
    return text;
  }

  // Use shared regex utilities for consistent term processing
  const validMainTerms = RegexUtils.normalizeSearchTerms(mainTerms);
  const validPairingsTerms = RegexUtils.normalizeSearchTerms(pairingsTerms);

  

  if (!validMainTerms.length && !validPairingsTerms.length) {
    
    return text;
  }

  const { mainTermToColor, pairingsTermToColor } = createTermColorMaps(
    validMainTerms,
    validPairingsTerms,
    isDarkMode
  );

  console.log('🎨 Color maps:', { 
    mainTermToColor: Object.fromEntries(mainTermToColor), 
    pairingsTermToColor: Object.fromEntries(pairingsTermToColor) 
  });

  let result = text;

  // First highlight pairings terms (they get borders)
  for (const [term, colorClass] of pairingsTermToColor.entries()) {
    
    const before = result;
    result = highlightWithRegex(result, term, colorClass, true);
    if (before !== result) {
      
    } else {
      
    }
  }

  // Then highlight main terms (no borders)
  for (const [term, colorClass] of mainTermToColor.entries()) {
    
    const before = result;
    result = highlightWithRegex(result, term, colorClass, false);
    if (before !== result) {
      
    } else {
      
    }
  }

  
  return result;
}