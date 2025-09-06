import { RegexUtils } from '../shared/regex-utils';

export function highlightWithRegex(
  text: string,
  term: string,
  colorClass: string,
  hasBorder: boolean = false
): string {
  if (!RegexUtils.isValidSearchTerm(term)) {
    console.log(`⚠️ Term "${term}" too short, skipping`);
    return text;
  }
  
  const regex = RegexUtils.createWordBoundaryRegex(term);
  console.log(`🔍 Created regex for "${term}":`, regex);
  
  const matches = text.match(regex);
  console.log(`📍 Matches found for "${term}":`, matches);
  
  const borderClass = hasBorder ? 'border' : '';
  
  const result = text.replace(
    regex,
    (match) => {
      const replacement = `<mark class="${colorClass} ${borderClass} px-0.5 rounded">${match}</mark>`;
      console.log(`🔄 Replacing "${match}" with:`, replacement);
      return replacement;
    }
  );
  
  return result;
}

// Re-export shared utilities for convenience
export { RegexUtils };