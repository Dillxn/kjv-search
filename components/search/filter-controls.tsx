'use client';

import { OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS } from '../../lib/kjv-parser';
import { FilterButton, Button } from '../ui/button';
import { getTextClass } from '../../lib/theme-utils';

interface FilterCounts {
  total: number;
  oldTestament: number;
  newTestament: number;
  books: Record<string, number>;
}

interface FilterControlsProps {
  selectedTestament: 'all' | 'old' | 'new';
  selectedBooks: string[];
  showFilters: boolean;
  filterCounts: FilterCounts;
  isDarkMode: boolean;
  onTestamentChange: (testament: 'all' | 'old' | 'new') => void;
  onBookToggle: (book: string) => void;
  onToggleFilters: () => void;
}

export function FilterControls({
  selectedTestament,
  selectedBooks,
  showFilters,
  filterCounts,
  isDarkMode,
  onTestamentChange,
  onBookToggle,
  onToggleFilters,
}: FilterControlsProps) {
  const getAvailableBooks = () => {
    switch (selectedTestament) {
      case 'old':
        return OLD_TESTAMENT_BOOKS;
      case 'new':
        return NEW_TESTAMENT_BOOKS;
      default:
        return [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
    }
  };

  const getResultsByTestament = (testament: 'old' | 'new'): number => {
    return testament === 'old'
      ? filterCounts.oldTestament
      : filterCounts.newTestament;
  };

  const getResultsByBook = (book: string): number => {
    return filterCounts.books[book] || 0;
  };

  return (
    <div className='mb-1.5'>
      <div className='flex items-center justify-between mb-1'>
        <span
          className={`text-xs font-medium ${getTextClass(isDarkMode, 'secondary')}`}
        >
          Filters
        </span>
        <Button
          onClick={onToggleFilters}
          variant="secondary"
          size="sm"
          isDarkMode={isDarkMode}
        >
          {showFilters ? 'Hide' : 'Show'}
        </Button>
      </div>

      {showFilters && (
        <div className='space-y-2'>
          {/* Testament Filter */}
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${getTextClass(isDarkMode, 'secondary')}`}
            >
              Testament
            </label>
            <div className='flex gap-1 flex-wrap'>
              {(['all', 'old', 'new'] as const).map((testament) => (
                <FilterButton
                  key={testament}
                  isSelected={selectedTestament === testament}
                  onClick={() => onTestamentChange(testament)}
                  isDarkMode={isDarkMode}
                  count={
                    testament === 'all'
                      ? filterCounts.total
                      : testament === 'old'
                      ? getResultsByTestament('old')
                      : getResultsByTestament('new')
                  }
                >
                  {testament === 'all'
                    ? 'All'
                    : testament === 'old'
                    ? 'Old Testament'
                    : 'New Testament'}
                </FilterButton>
              ))}
            </div>
          </div>

          {/* Book Filter */}
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${getTextClass(isDarkMode, 'secondary')}`}
            >
              Books
            </label>
            <div className='flex gap-1 flex-wrap max-h-32 overflow-y-auto'>
              {getAvailableBooks().map((book) => {
                const count = getResultsByBook(book);
                const isSelected = selectedBooks.includes(book);
                const isDisabled = count === 0;

                return (
                  <FilterButton
                    key={book}
                    isSelected={isSelected}
                    onClick={() => !isDisabled && onBookToggle(book)}
                    disabled={isDisabled}
                    isDarkMode={isDarkMode}
                    count={count}
                    title={isDisabled ? 'No results in this book' : undefined}
                  >
                    {book}
                  </FilterButton>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}