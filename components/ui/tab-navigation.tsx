'use client';

import { getBackgroundClass, getTextClass } from '../../lib/theme-utils';

interface TabNavigationProps {
  activeTab: 'all' | 'pairings';
  resultsCount: number;
  pairingsCount: number;
  isDarkMode: boolean;
  showGraph: boolean;
  allPairingsSelected: boolean;
  onTabChange: (tab: 'all' | 'pairings') => void;
  onSelectAllPairings: () => void;
  onDeselectAllPairings: () => void;
}

export function TabNavigation({
  activeTab,
  resultsCount,
  pairingsCount,
  isDarkMode,
  showGraph,
  allPairingsSelected,
  onTabChange,
  onSelectAllPairings,
  onDeselectAllPairings,
}: TabNavigationProps) {
  return (
    <div className='flex mb-2 gap-1 items-center justify-between flex-shrink-0'>
      <div className='flex gap-1 items-center'>
        <button
          onClick={() => onTabChange('all')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'all'
              ? `${getBackgroundClass(
                  isDarkMode,
                  'secondary'
                )} ${getTextClass(isDarkMode)} border-b-2 ${
                  isDarkMode ? 'border-blue-400' : 'border-blue-500'
                }`
              : `${getBackgroundClass(
                  isDarkMode,
                  'secondary'
                )} ${getTextClass(
                  isDarkMode,
                  'muted'
                )} hover:${getTextClass(isDarkMode, 'secondary')}`
          }`}
        >
          All Results ({resultsCount})
        </button>
        <button
          onClick={() => onTabChange('pairings')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'pairings'
              ? `${getBackgroundClass(
                  isDarkMode,
                  'secondary'
                )} ${getTextClass(isDarkMode)} border-b-2 ${
                  isDarkMode ? 'border-blue-400' : 'border-blue-500'
                }`
              : `${getBackgroundClass(
                  isDarkMode,
                  'secondary'
                )} ${getTextClass(
                  isDarkMode,
                  'muted'
                )} hover:${getTextClass(isDarkMode, 'secondary')}`
          }`}
        >
          Pairings ({pairingsCount})
        </button>
      </div>

      {activeTab === 'pairings' && showGraph && pairingsCount > 0 && (
        <label
          className='mr-2 flex items-center cursor-pointer'
          title={
            allPairingsSelected
              ? 'Deselect all pairings'
              : 'Select all pairings'
          }
        >
          <input
            type='checkbox'
            checked={allPairingsSelected}
            onChange={() => {
              if (allPairingsSelected) {
                onDeselectAllPairings();
              } else {
                onSelectAllPairings();
              }
            }}
            className={`w-4 h-4 rounded border-2 transition-colors ${
              isDarkMode
                ? 'border-gray-500 bg-gray-700 checked:bg-blue-600 checked:border-blue-600'
                : 'border-gray-300 bg-white checked:bg-blue-500 checked:border-blue-500'
            }`}
          />
        </label>
      )}
    </div>
  );
}