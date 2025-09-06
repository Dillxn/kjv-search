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
    console.log('❌ Early return: no text or terms');
    return text;
  }

  // Use shared regex utilities for consistent term processing
  const validMainTerms = RegexUtils.normalizeSearchTerms(mainTerms);
  const validPairingsTerms = RegexUtils.normalizeSearchTerms(pairingsTerms);

  console.log('✅ Valid terms:', { validMainTerms, validPairingsTerms });

  if (!validMainTerms.length && !validPairingsTerms.length) {
    console.log('❌ No valid terms after filtering');
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
    console.log(`🔵 Highlighting pairings term "${term}" with color "${colorClass}"`);
    const before = result;
    result = highlightWithRegex(result, term, colorClass, true);
    if (before !== result) {
      console.log(`✅ Pairings term "${term}" was highlighted`);
    } else {
      console.log(`❌ Pairings term "${term}" was NOT highlighted`);
    }
  }

  // Then highlight main terms (no borders)
  for (const [term, colorClass] of mainTermToColor.entries()) {
    console.log(`🟡 Highlighting main term "${term}" with color "${colorClass}"`);
    const before = result;
    result = highlightWithRegex(result, term, colorClass, false);
    if (before !== result) {
      console.log(`✅ Main term "${term}" was highlighted`);
    } else {
      console.log(`❌ Main term "${term}" was NOT highlighted`);
    }
  }

  console.log('🎯 Final result preview:', result.substring(0, 200) + '...');
  return result;
}