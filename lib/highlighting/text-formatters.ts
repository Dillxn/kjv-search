import { getHighlightColors, getPairingsHighlightColors } from './colors';

interface FormatOptions {
  extraClasses?: string;
  wrapperTag?: string;
}

function formatTextWithColorArray(
  text: string, 
  colors: string[], 
  options: FormatOptions = {}
): string {
  if (!text.trim()) return '';

  const { extraClasses = '', wrapperTag = 'span' } = options;
  const parts = text.split(/(\s+)/);
  let wordIndex = 0;

  return parts
    .map((part) => {
      if (/^\s+$/.test(part)) {
        return part;
      } else if (part.trim()) {
        const colorClass = colors[wordIndex % colors.length];
        wordIndex++;
        const classes = `${colorClass} px-0.5 rounded ${extraClasses}`.trim();
        return `<${wrapperTag} class="${classes}">${part}</${wrapperTag}>`;
      }
      return part;
    })
    .join('');
}

export function formatTextWithColors(text: string, isDarkMode: boolean): string {
  const colors = getHighlightColors(isDarkMode);
  return formatTextWithColorArray(text, colors);
}

export function formatPairingsTextWithColors(text: string, isDarkMode: boolean): string {
  const colors = getPairingsHighlightColors(isDarkMode);
  return formatTextWithColorArray(text, colors, { extraClasses: 'border' });
}