'use client';

import { useRef, useEffect, useCallback } from 'react';
import { formatTextWithColors, formatPairingsTextWithColors } from '../../lib/highlighting';
import { getTextClass, getBackgroundClass, getBorderClass } from '../../lib/theme-utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  isDarkMode: boolean;
  isPairingsInput?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  isDarkMode,
  isPairingsInput = false,
}: SearchInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const formatFunction = isPairingsInput ? formatPairingsTextWithColors : formatTextWithColors;

  // Update contentEditable when value changes externally
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = formatFunction(value, isDarkMode);
    }
  }, [value, isDarkMode, formatFunction]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    onChange(text);

    // Re-apply styling after input
    if (e.currentTarget === document.activeElement) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      // Get cursor position relative to the text content
      const range = selection.getRangeAt(0);
      let cursorOffset = 0;

      // Calculate the actual text offset by walking through all text nodes
      const walker = document.createTreeWalker(
        e.currentTarget,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      let found = false;
      while ((node = walker.nextNode())) {
        if (node === range.startContainer) {
          cursorOffset += range.startOffset;
          found = true;
          break;
        }
        cursorOffset += node.textContent?.length || 0;
      }

      // Update HTML with colored spans
      e.currentTarget.innerHTML = formatFunction(text, isDarkMode);

      // Restore cursor position
      if (found && text) {
        try {
          // Walk through the new DOM structure to find the correct position
          const newWalker = document.createTreeWalker(
            e.currentTarget,
            NodeFilter.SHOW_TEXT,
            null
          );

          let currentOffset = 0;
          let targetNode: Node | null = null;
          let targetOffset = 0;

          while ((node = newWalker.nextNode())) {
            const nodeLength = node.textContent?.length || 0;
            if (currentOffset + nodeLength >= cursorOffset) {
              targetNode = node;
              targetOffset = cursorOffset - currentOffset;
              break;
            }
            currentOffset += nodeLength;
          }

          if (targetNode) {
            const newRange = document.createRange();
            newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } catch {
          // If cursor restoration fails, just place it at the end
          const newRange = document.createRange();
          newRange.selectNodeContents(e.currentTarget);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  }, [onChange, formatFunction, isDarkMode]);

  return (
    <div className='mb-1.5'>
      <label
        className={`block text-xs font-medium mb-0.5 ${getTextClass(isDarkMode, 'secondary')}`}
      >
        {label}
      </label>
      <div className='relative'>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning={true}
          data-placeholder={placeholder}
          onInput={handleInput}
          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[2.25rem] ${getBackgroundClass(isDarkMode, 'input')} ${getBorderClass(isDarkMode, 'secondary')} ${getTextClass(isDarkMode)} [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 [&:empty]:before:pointer-events-none`}
        />
      </div>
    </div>
  );
}