'use client';

import { MoonStarIcon, SunIcon, WorkflowIcon } from 'lucide-react';
import { ToggleButton } from './toggle-button';
import { SearchInput } from '../search/search-input';
import { FilterControls } from '../search/filter-controls';
import { getBackgroundClass, getTextClass } from '../../lib/theme-utils';

interface AppHeaderProps {
  isDarkMode: boolean;
  showGraph: boolean;
  searchTerms: string;
  pairingsSearchTerms: string;
  activeTab: 'all' | 'pairings';
  selectedTestament: 'all' | 'old' | 'new';
  selectedBooks: string[];
  showFilters: boolean;
  filterCounts: {
    total: number;
    oldTestament: number;
    newTestament: number;
    books: Record<string, number>;
  };
  onDarkModeToggle: () => void;
  onGraphToggle: () => void;
  onSearchTermsChange: (terms: string) => void;
  onPairingsSearchTermsChange: (terms: string) => void;
  onTestamentChange: (testament: 'all' | 'old' | 'new') => void;
  onBookToggle: (book: string) => void;
  onToggleFilters: () => void;
}

export function AppHeader({
  isDarkMode,
  showGraph,
  searchTerms,
  pairingsSearchTerms,
  activeTab,
  selectedTestament,
  selectedBooks,
  showFilters,
  filterCounts,
  onDarkModeToggle,
  onGraphToggle,
  onSearchTermsChange,
  onPairingsSearchTermsChange,
  onTestamentChange,
  onBookToggle,
  onToggleFilters,
}: AppHeaderProps) {
  return (
    <div
      className={`rounded-lg shadow-md mb-2 p-1.5 ${getBackgroundClass(
        isDarkMode,
        'card'
      )}`}
    >
      <div className='flex justify-between items-center mb-1'>
        <h1 className={`text-base font-bold ${getTextClass(isDarkMode)}`}>
          KJV Bible Search
        </h1>
        <div className='flex gap-0 rounded-sm overflow-clip'>
          <ToggleButton
            isActive={showGraph}
            onClick={onGraphToggle}
            activeIcon={WorkflowIcon}
            inactiveIcon={WorkflowIcon}
            title={
              showGraph ? 'Hide graph visualizer' : 'Show graph visualizer'
            }
            isDarkMode={isDarkMode}
          />

          <ToggleButton
            isActive={isDarkMode}
            onClick={onDarkModeToggle}
            activeIcon={SunIcon}
            inactiveIcon={MoonStarIcon}
            title={
              isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
            }
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      <SearchInput
        value={searchTerms}
        onChange={onSearchTermsChange}
        placeholder='Start typing to search... (min 2 characters)'
        label='Enter search words (separated by spaces):'
        isDarkMode={isDarkMode}
      />

      {activeTab === 'pairings' && (
        <SearchInput
          value={pairingsSearchTerms}
          onChange={onPairingsSearchTermsChange}
          placeholder='Enter second group of words...'
          label='Second search group (for pairings):'
          isDarkMode={isDarkMode}
          isPairingsInput={true}
        />
      )}

      <FilterControls
        selectedTestament={selectedTestament}
        selectedBooks={selectedBooks}
        showFilters={showFilters}
        filterCounts={filterCounts}
        isDarkMode={isDarkMode}
        onTestamentChange={onTestamentChange}
        onBookToggle={onBookToggle}
        onToggleFilters={onToggleFilters}
      />
    </div>
  );
}