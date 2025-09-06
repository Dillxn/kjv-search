import { RegexUtils } from '../shared/regex-utils';

export function highlightWithRegex(
  text: string,
  term: string,
  colorClass: string,
  hasBorder: boolean = false
): string {
  if (!RegexUtils.isValidSearchTerm(term)) {
    
    return text;
  }
  
  const regex = RegexUtils.createWordBoundaryRegex(term);
  
  
  const matches = text.match(regex);
  
  
  const borderClass = hasBorder ? 'border' : '';
  
  const result = text.replace(
    regex,
    (match) => {
      const replacement = `<mark class="${colorClass} ${borderClass} px-0.5 rounded">${match}</mark>`;
      
      return replacement;
    }
  );
  
  return result;
}

// Re-export shared utilities for convenience
export { RegexUtils };