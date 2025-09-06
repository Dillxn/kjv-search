'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight?: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  estimatedItemHeight?: number;
  localStorageKey?: string;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  estimatedItemHeight = 50,
  localStorageKey
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400); // Default fallback
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Simple height measurement on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (scrollElementRef.current) {
        const rect = scrollElementRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Restore scroll position from localStorage on mount
  useEffect(() => {
    if (localStorageKey && isInitialLoad && scrollElementRef.current) {
      const savedScrollTop = localStorage.getItem(localStorageKey);
      if (savedScrollTop) {
        const scrollPosition = parseInt(savedScrollTop, 10);
        if (!isNaN(scrollPosition) && scrollPosition > 0) {
          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            if (scrollElementRef.current) {
              scrollElementRef.current.scrollTop = scrollPosition;
              setScrollTop(scrollPosition);
            }
          }, 0);
        }
      }
      setIsInitialLoad(false);
    }
  }, [localStorageKey, isInitialLoad]);

  // Calculate item heights and positions
  const { totalHeight, itemPositions } = useMemo(() => {
    const positions: number[] = [];
    let currentPosition = 0;
    
    for (let i = 0; i < items.length; i++) {
      positions[i] = currentPosition;
      
      let height: number;
      if (itemHeight) {
        // Use provided height function/value
        height = typeof itemHeight === 'function' 
          ? itemHeight(items[i], i) 
          : itemHeight;
      } else {
        // Use measured height if available, otherwise use estimated height
        height = measuredHeights.get(i) || estimatedItemHeight;
      }
      
      currentPosition += height;
    }
    
    return {
      totalHeight: currentPosition,
      itemPositions: positions
    };
  }, [items, itemHeight, measuredHeights, estimatedItemHeight]);

  // Find visible range using binary search for better performance
  const { startIndex, endIndex } = useMemo(() => {
    if (itemPositions.length === 0) return { startIndex: 0, endIndex: 0 };

    // Binary search for start index
    let start = 0;
    let end = itemPositions.length - 1;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemPositions[mid] < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    
    const startIdx = Math.max(0, start - overscan);
    
    // Find end index
    const viewportBottom = scrollTop + containerHeight;
    let endIdx = startIdx;
    while (endIdx < itemPositions.length && itemPositions[endIdx] < viewportBottom) {
      endIdx++;
    }
    endIdx = Math.min(items.length - 1, endIdx + overscan);
    
    return { startIndex: startIdx, endIndex: endIdx };
  }, [scrollTop, containerHeight, itemPositions, overscan, items.length]);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = itemPositions[startIndex] || 0;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Save scroll position to localStorage
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, newScrollTop.toString());
    }
  }, [localStorageKey]);

  // Measure item heights after render
  useEffect(() => {
    if (!itemHeight) { // Only measure if no height function provided
      const newMeasuredHeights = new Map(measuredHeights);
      let hasChanges = false;

      itemRefs.current.forEach((element, index) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          const currentHeight = measuredHeights.get(index);
          
          if (currentHeight !== rect.height) {
            newMeasuredHeights.set(index, rect.height);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setMeasuredHeights(newMeasuredHeights);
      }
    }
  }, [visibleItems, itemHeight, measuredHeights]);

  // Set item ref callback
  const setItemRef = useCallback((index: number) => (element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ 
        height: '100%',
        scrollbarWidth: 'auto', // Ensure scrollbar is visible on Firefox
        scrollbarGutter: 'stable' // Reserve space for scrollbar
      }}
      onScroll={handleScroll}
    >
      <div 
        style={{ 
          height: totalHeight, 
          position: 'relative',
          minHeight: '100%' // Ensure the container is always scrollable
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            let height: number | undefined;
            
            if (itemHeight) {
              height = typeof itemHeight === 'function' 
                ? itemHeight(item, actualIndex) 
                : itemHeight;
            } else {
              height = measuredHeights.get(actualIndex) || estimatedItemHeight;
            }
            
            return (
              <div
                key={actualIndex}
                ref={!itemHeight ? setItemRef(actualIndex) : undefined}
                style={{ height: itemHeight ? height : undefined }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}