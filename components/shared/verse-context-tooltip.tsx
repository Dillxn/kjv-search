'use client';

import { useMemo, useState, useCallback } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { kjvParser, Verse } from '../../lib';

interface VerseContextTooltipProps {
  verse: Verse;
  isDarkMode: boolean;
  children: ReactElement;
  contextBefore?: number;
  contextAfter?: number;
  title?: ReactNode;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function VerseContextTooltip({
  verse,
  isDarkMode,
  children,
  contextBefore = 1,
  contextAfter = 1,
  title,
}: VerseContextTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextVerses = useMemo(() => {
    const verses = kjvParser.getVerses();
    if (!verses?.length) return null;

    let index =
      typeof verse.position === 'number'
        ? clamp(verse.position, 0, verses.length - 1)
        : -1;

    if (
      index < 0 ||
      verses[index].reference !== verse.reference ||
      verses[index].book !== verse.book
    ) {
      index = verses.findIndex((candidate) => candidate.reference === verse.reference);
    }

    if (index < 0) {
      return null;
    }

    const before: Verse[] = [];
    const after: Verse[] = [];

    for (
      let i = index - 1;
      i >= 0 && before.length < contextBefore && verses[i].book === verse.book;
      i--
    ) {
      before.unshift(verses[i]);
    }

    for (
      let i = index + 1;
      i < verses.length && after.length < contextAfter && verses[i].book === verse.book;
      i++
    ) {
      after.push(verses[i]);
    }

    return {
      before,
      target: verses[index],
      after,
    };
  }, [contextAfter, contextBefore, verse]);

  const tooltip = useMemo(() => {
    if (!contextVerses || !isOpen) return null;

    const themeClasses = isDarkMode
      ? 'bg-gray-900 border border-gray-700 text-gray-200 shadow-xl'
      : 'bg-white border border-gray-200 text-gray-800 shadow-lg';

    const heading = title ?? `${contextVerses.target.book} ${contextVerses.target.chapter}`;

    const renderLine = (contextVerse: Verse, isTarget: boolean) => (
      <div
        key={contextVerse.reference}
        className={`text-xs leading-relaxed ${
          isTarget
            ? isDarkMode
              ? 'font-semibold text-blue-200'
              : 'font-semibold text-blue-700'
            : isDarkMode
              ? 'text-gray-300'
              : 'text-gray-600'
        }`}
      >
        <span
          className={`mr-1 font-semibold ${
            isTarget
              ? isDarkMode
                ? 'text-blue-200'
                : 'text-blue-700'
              : isDarkMode
                ? 'text-gray-400'
                : 'text-gray-500'
          }`}
        >
          {contextVerse.reference} —
        </span>
        <span>{contextVerse.text}</span>
      </div>
    );

    return (
      <div
        className={`absolute z-50 w-80 max-w-[22rem] mt-2 left-1/2 -translate-x-1/2 rounded-md p-3 ${themeClasses}`}
      >
        <div
          className={`text-[10px] uppercase tracking-wide font-semibold mb-2 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {heading}
        </div>
        <div className='space-y-2'>
          {contextVerses.before.map((ctx) => renderLine(ctx, false))}
          {renderLine(contextVerses.target, true)}
          {contextVerses.after.map((ctx) => renderLine(ctx, false))}
        </div>
      </div>
    );
  }, [contextVerses, isDarkMode, isOpen, title]);

  return (
    <div
      className='relative'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {contextVerses ? tooltip : null}
    </div>
  );
}
