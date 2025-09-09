'use client';

import { Tab } from './tab';
import { CardinalityToggle, CardinalityType } from './cardinality-toggle';

interface TabNavigationProps {
  activeTab: 'all' | 'linking';
  resultsCount: number;
  pairingsCount: number;
  linkingsCount: number;
  isDarkMode: boolean;
  showGraph: boolean;
  allPairingsSelected: boolean;
  onTabChange: (tab: 'all' | 'linking') => void;
  onSelectAllPairings: () => void;
  onDeselectAllPairings: () => void;
  onBulkCardinalityChange?: (cardinality: CardinalityType) => void;
}

export function TabNavigation({
  activeTab,
  resultsCount,
  pairingsCount,
  linkingsCount,
  isDarkMode,
  showGraph,
  allPairingsSelected,
  onTabChange,
  onSelectAllPairings,
  onDeselectAllPairings,
  onBulkCardinalityChange,
}: TabNavigationProps) {
  return (
    <div className='flex gap-2 items-center justify-between flex-shrink-0'>
      <div className='flex gap-2 items-center'>
        <Tab
          isActive={activeTab === 'all'}
          isDarkMode={isDarkMode}
          onClick={() => onTabChange('all')}
        >
          All Results ({resultsCount})
        </Tab>
        <Tab
          isActive={activeTab === 'linking'}
          isDarkMode={isDarkMode}
          onClick={() => onTabChange('linking')}
        >
          Linking ({linkingsCount})
        </Tab>
      </div>

      {activeTab === 'linking' && showGraph && linkingsCount > 0 && onBulkCardinalityChange && (
        <div className='mr-2'>
          <CardinalityToggle
            value={null} // Always start unselected for bulk operations
            onChange={(cardinality) => {
              if (cardinality === null) {
                onDeselectAllPairings();
              } else {
                onBulkCardinalityChange(cardinality);
              }
            }}
            isDarkMode={isDarkMode}
            isInGraph={allPairingsSelected}
            onToggleGraph={() => {
              if (allPairingsSelected) {
                onDeselectAllPairings();
              } else {
                onSelectAllPairings();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}