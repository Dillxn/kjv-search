'use client';

import {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement, ReactNode, MouseEvent as ReactMouseEvent } from 'react';
import { Crosshair } from 'lucide-react';
import { kjvParser, Verse } from '../../lib';

interface VerseContextTooltipProps {
  verse: Verse;
  isDarkMode: boolean;
  children: ReactElement;
  contextBefore?: number;
  contextAfter?: number;
  title?: ReactNode;
  triggerMode?: 'hover' | 'button';
  headingAlignWithTarget?: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const LOAD_CHUNK = 8;
const SCROLL_THRESHOLD_PX = 48;
const TOOLTIP_OFFSET_PX = 8;
const TOOLTIP_VIEWPORT_MARGIN = 12;

export function VerseContextTooltip({
  verse,
  isDarkMode,
  children,
  contextBefore = 1,
  contextAfter = 1,
  title,
  triggerMode = 'hover',
  headingAlignWithTarget = true,
}: VerseContextTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (triggerMode === 'hover') {
      setIsOpen(true);
    }
  }, [triggerMode]);

  const handleMouseLeave = useCallback(() => {
    if (triggerMode === 'hover') {
      setIsOpen(false);
    }
  }, [triggerMode]);

  const handleFocus = useCallback(() => {
    if (triggerMode === 'hover') {
      setIsOpen(true);
    }
  }, [triggerMode]);

  const handleBlur = useCallback(() => {
    if (triggerMode === 'hover') {
      setIsOpen(false);
    }
  }, [triggerMode]);

  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const targetVerseRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const previousScrollHeightRef = useRef<number | null>(null);
  const lastScrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const hasScrolledToTargetRef = useRef(false);
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const allVerses = useMemo(() => kjvParser.getVerses(), []);
  const verseCount = allVerses.length;

  const targetIndex = useMemo(() => {
    if (!verseCount) {
      return -1;
    }

    let index =
      typeof verse.position === 'number'
        ? clamp(verse.position, 0, verseCount - 1)
        : -1;

    if (
      index < 0 ||
      allVerses[index].reference !== verse.reference ||
      allVerses[index].book !== verse.book
    ) {
      index = allVerses.findIndex(
        (candidate) =>
          candidate.reference === verse.reference && candidate.book === verse.book
      );
    }

    return index;
  }, [allVerses, verse.book, verse.position, verse.reference, verseCount]);

  const targetVerse = targetIndex >= 0 ? allVerses[targetIndex] : null;

  useEffect(() => {
    if (triggerMode !== 'button') {
      setPortalContainer(null);
      return;
    }

    if (typeof document !== 'undefined') {
      setPortalContainer(document.body);
    }
  }, [triggerMode]);

  useEffect(() => {
    if (!isOpen) {
      setVisibleRange(null);
      hasScrolledToTargetRef.current = false;
      lastScrollDirectionRef.current = null;
      previousScrollHeightRef.current = null;
      return;
    }

    if (targetIndex < 0 || !verseCount) {
      setVisibleRange(null);
      return;
    }

    hasScrolledToTargetRef.current = false;
    lastScrollDirectionRef.current = null;
    previousScrollHeightRef.current = null;

    const beforeCount = Math.max(0, contextBefore);
    const afterCount = Math.max(0, contextAfter);
    const maxBefore = Math.max(beforeCount, LOAD_CHUNK);
    const maxAfter = Math.max(afterCount, LOAD_CHUNK);

    let start = targetIndex;
    let collectedBefore = 0;
    while (start > 0 && collectedBefore < maxBefore) {
      const candidate = allVerses[start - 1];
      if (candidate.book !== verse.book) {
        break;
      }
      start -= 1;
      collectedBefore += 1;
    }

    let end = targetIndex;
    let collectedAfter = 0;
    while (end < verseCount - 1 && collectedAfter < maxAfter) {
      const candidate = allVerses[end + 1];
      if (candidate.book !== verse.book) {
        break;
      }
      end += 1;
      collectedAfter += 1;
    }

    setVisibleRange({ start, end });
  }, [allVerses, contextAfter, contextBefore, isOpen, targetIndex, verse.book, verseCount]);

  const visibleVerses = useMemo(() => {
    if (!visibleRange) {
      return [];
    }

    return allVerses.slice(visibleRange.start, visibleRange.end + 1);
  }, [allVerses, visibleRange]);

  const updateTooltipPosition = useCallback(() => {
    if (!rootRef.current || !tooltipRef.current) {
      return;
    }

    const anchorRect = rootRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = anchorRect.bottom + TOOLTIP_OFFSET_PX;
    if (top + tooltipRect.height > viewportHeight - TOOLTIP_VIEWPORT_MARGIN) {
      top = Math.max(
        TOOLTIP_VIEWPORT_MARGIN,
        anchorRect.top - tooltipRect.height - TOOLTIP_OFFSET_PX
      );
    }

    let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    left = Math.min(
      Math.max(TOOLTIP_VIEWPORT_MARGIN, left),
      viewportWidth - tooltipRect.width - TOOLTIP_VIEWPORT_MARGIN
    );

    setTooltipStyle({ top, left });
  }, []);

  const loadMoreBefore = useCallback(() => {
    setVisibleRange((prev) => {
      if (!prev || prev.start === 0) {
        lastScrollDirectionRef.current = null;
        previousScrollHeightRef.current = null;
        return prev;
      }

      const container = scrollContainerRef.current;
      if (container) {
        previousScrollHeightRef.current = container.scrollHeight;
      }

      lastScrollDirectionRef.current = 'up';
      const nextStart = Math.max(0, prev.start - LOAD_CHUNK);

      if (nextStart === prev.start) {
        lastScrollDirectionRef.current = null;
        previousScrollHeightRef.current = null;
        return prev;
      }

      return {
        start: nextStart,
        end: prev.end,
      };
    });
  }, []);

  const loadMoreAfter = useCallback(() => {
    setVisibleRange((prev) => {
      if (!prev || prev.end >= verseCount - 1) {
        lastScrollDirectionRef.current = null;
        previousScrollHeightRef.current = null;
        return prev;
      }

      const container = scrollContainerRef.current;
      if (container) {
        previousScrollHeightRef.current = container.scrollHeight;
      }

      lastScrollDirectionRef.current = 'down';
      const nextEnd = Math.min(verseCount - 1, prev.end + LOAD_CHUNK);

      if (nextEnd === prev.end) {
        lastScrollDirectionRef.current = null;
        previousScrollHeightRef.current = null;
        return prev;
      }

      return {
        start: prev.start,
        end: nextEnd,
      };
    });
  }, [verseCount]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollTop <= SCROLL_THRESHOLD_PX) {
      loadMoreBefore();
    }

    if (scrollHeight - (scrollTop + clientHeight) <= SCROLL_THRESHOLD_PX) {
      loadMoreAfter();
    }
  }, [loadMoreAfter, loadMoreBefore]);

  useLayoutEffect(() => {
    const direction = lastScrollDirectionRef.current;
    const container = scrollContainerRef.current;

    if (!direction || !container || previousScrollHeightRef.current === null) {
      lastScrollDirectionRef.current = null;
      previousScrollHeightRef.current = null;
      return;
    }

    if (direction === 'up') {
      const heightDiff = container.scrollHeight - previousScrollHeightRef.current;
      if (heightDiff > 0) {
        container.scrollTop += heightDiff;
      }
    }

    lastScrollDirectionRef.current = null;
    previousScrollHeightRef.current = null;
  }, [visibleRange]);

  const centerOnTarget = useCallback(() => {
    const container = scrollContainerRef.current;
    const targetElement = targetVerseRef.current;

    if (!container || !targetElement) {
      return;
    }

    const relativeOffset = targetElement.offsetTop - container.offsetTop;
    const centeredOffset =
      relativeOffset - container.clientHeight / 2 + targetElement.clientHeight / 2;

    container.scrollTop = Math.max(0, centeredOffset);
    hasScrolledToTargetRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || hasScrolledToTargetRef.current) {
      return;
    }

    centerOnTarget();
  }, [centerOnTarget, isOpen, visibleRange]);

  const showTooltip = isOpen && !!targetVerse && !!visibleRange && visibleVerses.length > 0;

  useLayoutEffect(() => {
    if (triggerMode !== 'button' || !showTooltip) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      updateTooltipPosition();
    });

    return () => cancelAnimationFrame(frame);
  }, [showTooltip, triggerMode, updateTooltipPosition, visibleRange]);

  useEffect(() => {
    if (triggerMode !== 'button' || !showTooltip) {
      return;
    }

    const handle = () => updateTooltipPosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);

    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [showTooltip, triggerMode, updateTooltipPosition]);

  useEffect(() => {
    if (!showTooltip) {
      setTooltipStyle({ top: -9999, left: -9999 });
    }
  }, [showTooltip]);

  const themeClasses = isDarkMode
    ? 'bg-gray-900 border border-gray-700 text-gray-200 shadow-xl'
    : 'bg-white border border-gray-200 text-gray-800 shadow-lg';

  const headingContent = useMemo<ReactNode>(() => {
    if (title) {
      return title;
    }
    if (!targetVerse) {
      return 'Verse Context';
    }
    return headingAlignWithTarget
      ? targetVerse.reference
      : `${targetVerse.book} ${targetVerse.chapter}`;
  }, [headingAlignWithTarget, targetVerse, title]);

  const headingClasses = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const recenterButtonClasses = isDarkMode
    ? 'p-1 rounded border border-transparent text-blue-200 hover:text-blue-100 hover:bg-blue-500/10 hover:border-blue-500/60 transition-colors disabled:opacity-40 disabled:pointer-events-none'
    : 'p-1 rounded border border-transparent text-blue-700 hover:text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-colors disabled:opacity-40 disabled:pointer-events-none';

  const handleRecenter = useCallback(() => {
    centerOnTarget();
  }, [centerOnTarget]);

  const trigger = useMemo(() => {
    if (triggerMode !== 'button') {
      return children;
    }

    return cloneElement(children, {
      onClick: (event: ReactMouseEvent<HTMLElement>) => {
        if (typeof children.props.onClick === 'function') {
          children.props.onClick(event);
        }
        setIsOpen((prev) => !prev);
      },
      'aria-haspopup': 'dialog',
      'aria-expanded': isOpen,
      'data-open': isOpen ? 'true' : 'false',
    });
  }, [children, isOpen, triggerMode]);

  useEffect(() => {
    if (triggerMode !== 'button' || !isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, triggerMode]);

  const tooltipContent = showTooltip ? (
    <div ref={tooltipRef} className={`w-80 max-w-[22rem] rounded-md p-3 ${themeClasses}`}>
      <div className='flex items-center justify-between gap-2 mb-2'>
        <div className={`text-[10px] uppercase tracking-wide font-semibold ${headingClasses}`}>
          {headingContent}
        </div>
        <button
          type='button'
          onClick={handleRecenter}
          className={recenterButtonClasses}
          aria-label='Center on selected verse'
          disabled={!targetVerse}
        >
          <Crosshair className='h-3.5 w-3.5' strokeWidth={2} />
        </button>
      </div>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className='max-h-80 overflow-y-auto pr-1 space-y-2'
      >
        {visibleVerses.map((contextVerse) => {
          const isTarget = contextVerse.position === verse.position;
          return (
            <div
              key={`${contextVerse.reference}-${contextVerse.position}`}
              ref={isTarget ? targetVerseRef : undefined}
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
        })}
      </div>
    </div>
  ) : null;

  const inlineTooltip =
    triggerMode !== 'button' && showTooltip ? (
      <div className='absolute z-50 mt-2 left-1/2 -translate-x-1/2'>{tooltipContent}</div>
    ) : null;

  const portalTooltip =
    triggerMode === 'button' && showTooltip && portalContainer && tooltipContent
      ? createPortal(
          <div
            className='pointer-events-auto z-[1000]'
            style={{
              position: 'fixed',
              top: tooltipStyle.top,
              left: tooltipStyle.left,
            }}
          >
            {tooltipContent}
          </div>,
          portalContainer
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className='relative'
        onMouseEnter={triggerMode === 'hover' ? handleMouseEnter : undefined}
        onMouseLeave={triggerMode === 'hover' ? handleMouseLeave : undefined}
        onFocus={triggerMode === 'hover' ? handleFocus : undefined}
        onBlur={triggerMode === 'hover' ? handleBlur : undefined}
      >
        {trigger}
        {inlineTooltip}
      </div>
      {portalTooltip}
    </>
  );
}
