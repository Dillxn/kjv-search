'use client';

import { OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS } from '../../lib/kjv-parser';

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
          className={`text-xs font-medium ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Filters
        </span>
        <button
          onClick={onToggleFilters}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
            isDarkMode
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showFilters ? 'Hide' : 'Show'}
        </button>
      </div>

      {showFilters && (
        <div className='space-y-2'>
          {/* Testament Filter */}
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Testament
            </label>
            <div className='flex gap-1 flex-wrap'>
              {(['all', 'old', 'new'] as const).map((testament) => (
                <button
                  key={testament}
                  onClick={() => onTestamentChange(testament)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedTestament === testament
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {testament === 'all'
                    ? `All (${filterCounts.total})`
                    : testament === 'old'
                    ? `Old Testament (${getResultsByTestament('old')})`
                    : `New Testament (${getResultsByTestament('new')})`}
                </button>
              ))}
            </div>
          </div>

          {/* Book Filter */}
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Books
            </label>
            <div className='flex gap-1 flex-wrap max-h-32 overflow-y-auto'>
              {getAvailableBooks().map((book) => {
                const count = getResultsByBook(book);
                const isSelected = selectedBooks.includes(book);
                const isDisabled = count === 0;

                return (
                  <button
                    key={book}
                    onClick={() => !isDisabled && onBookToggle(book)}
                    disabled={isDisabled}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      isDisabled
                        ? isDarkMode
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : isSelected
                        ? isDarkMode
                          ? 'bg-green-600 text-white'
                          : 'bg-green-500 text-white'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={isDisabled ? 'No results in this book' : undefined}
                  >
                    {book} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}