'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { formatTextWithColors, formatPairingsTextWithColors } from '../../lib/highlighting';
import { getTextClass, getBackgroundClass, getBorderClass } from '../../lib/theme-utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  isDarkMode: boolean;
  isPairingsInput?: boolean;
  processedSearchTerms?: string[];
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  isDarkMode,
  isPairingsInput = false,
  processedSearchTerms,
}: SearchInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const searchDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formatDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<string>(value);
  const prevRawTextRef = useRef<string>(value);

  // Debounced onChange handler
  const debouncedOnChange = useMemo(() => {
    return (newValue: string) => {
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }
      searchDebounceTimeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, 150); // 150ms debounce for input
    };
  }, [onChange]);

  // Update contentEditable when value changes externally
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      const formattedText = isPairingsInput
        ? formatPairingsTextWithColors(value, isDarkMode)
        : formatTextWithColors(value, isDarkMode, false);
      editorRef.current.innerHTML = formattedText;
      // Store the formatted text content, not the normalized value
      lastValueRef.current = value;
      prevRawTextRef.current = value;
    }
  }, [value, isDarkMode, isPairingsInput, processedSearchTerms]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    // Prevent default to handle paste manually
    e.preventDefault();

    // Get pasted text
    const pastedText = e.clipboardData.getData('text/plain');
    if (!pastedText.trim()) return;

    // Get current content and cursor position
    const currentContent = e.currentTarget.textContent || '';
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startOffset = range.startOffset;

      // Insert pasted text at cursor position
      const beforeCursor = currentContent.substring(0, startOffset);
      const afterCursor = currentContent.substring(startOffset);
      const newContent = beforeCursor + pastedText + afterCursor;

      // Format the content with colors
      const formattedText = isPairingsInput
        ? formatPairingsTextWithColors(newContent, isDarkMode)
        : formatTextWithColors(newContent, isDarkMode, false);

      // Set the formatted HTML
      e.currentTarget.innerHTML = formattedText;

      // Set cursor position to end
      try {
        const newRange = document.createRange();
        newRange.selectNodeContents(e.currentTarget);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch {
        // Ignore cursor positioning errors
      }

      // Trigger search
      debouncedOnChange(newContent);
    } else {
      // No selection - replace all content
      const formattedText = isPairingsInput
        ? formatPairingsTextWithColors(pastedText, isDarkMode)
        : formatTextWithColors(pastedText, isDarkMode, false);
      e.currentTarget.innerHTML = formattedText;

      // Trigger search
      debouncedOnChange(pastedText);
    }
  }, [debouncedOnChange, isDarkMode, isPairingsInput]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const rawText = e.currentTarget.textContent || '';

    // For search purposes, normalize the text
    const searchText = rawText
      .replace(/[\t\n\r]+/g, ' ')  // Replace tabs/newlines with spaces
      .replace(/\s+/g, ' ')        // Collapse multiple spaces to single space
      .trim();                     // Remove leading/trailing whitespace

    // Always call debounced onChange for search functionality with normalized text
    debouncedOnChange(searchText);

    // If the user just typed whitespace, immediately re-format to close the current mark
    // so the next term doesn't inherit the previous highlight while typing.
    const endsWithWhitespace = /[\s\u00A0]$/.test(rawText);
    if (e.currentTarget === document.activeElement && endsWithWhitespace && rawText.trim()) {
      if (formatDebounceTimeoutRef.current) {
        clearTimeout(formatDebounceTimeoutRef.current);
      }

      const formattedText = isPairingsInput
        ? formatPairingsTextWithColors(rawText, isDarkMode)
        : formatTextWithColors(rawText, isDarkMode, false);

      e.currentTarget.innerHTML = formattedText;
      lastValueRef.current = rawText;
      prevRawTextRef.current = rawText;

      // Restore caret to the end after formatting
      try {
        const selection = window.getSelection();
        if (selection) {
          const newRange = document.createRange();
          newRange.selectNodeContents(e.currentTarget);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } catch {}

      return;
    }

    // Skip formatting if no text
    if (!rawText.trim()) {
      return;
    }

    // Debounce formatting updates - always format after typing stops
    if (e.currentTarget === document.activeElement) {
      if (formatDebounceTimeoutRef.current) {
        clearTimeout(formatDebounceTimeoutRef.current);
      }

      formatDebounceTimeoutRef.current = setTimeout(() => {
        if (!e.currentTarget || document.activeElement !== e.currentTarget) {
          return;
        }

        // Get current text content again (might have changed during debounce)
        const currentText = e.currentTarget.textContent || '';
        if (!currentText.trim()) return;

        // Only format if the text has actually changed since last formatting
        if (currentText === lastValueRef.current) {
          return;
        }

        // Update HTML with colored spans using current text
        const formattedText = isPairingsInput
          ? formatPairingsTextWithColors(currentText, isDarkMode)
          : formatTextWithColors(currentText, isDarkMode, false);

        e.currentTarget.innerHTML = formattedText;
        lastValueRef.current = currentText;
        prevRawTextRef.current = currentText;

        // Focus back on the element without changing cursor position
        e.currentTarget.focus();
      }, 200); // Slightly longer debounce
    }
  }, [debouncedOnChange, isDarkMode, isPairingsInput]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }
      if (formatDebounceTimeoutRef.current) {
        clearTimeout(formatDebounceTimeoutRef.current);
      }
    };
  }, []);

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
          onPaste={handlePaste}
          className={`w-full px-1.5 py-1 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getBackgroundClass(isDarkMode, 'input')} ${getBorderClass(isDarkMode, 'secondary')} ${getTextClass(isDarkMode)} [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 [&:empty]:before:pointer-events-none`}
        />
      </div>
    </div>
  );
}