'use client';

import { ArrowLeft, ArrowRight, MoveHorizontal } from 'lucide-react';
import { getButtonClass, getBackgroundClass } from '../../lib/theme-utils';

export type CardinalityType = 'left' | 'omni' | 'right' | null;

interface CardinalityToggleProps {
  value: CardinalityType;
  onChange: (value: CardinalityType) => void;
  isDarkMode: boolean;
  disabled?: boolean;
  isInGraph?: boolean;
  onToggleGraph?: () => void;
}

const cardinalityOptions = [
  {
    value: 'left' as const,
    icon: ArrowLeft,
    title: 'Second term points to first term',
    label: 'Left'
  },
  {
    value: 'omni' as const,
    icon: MoveHorizontal,
    title: 'Both directions (omni-directional)',
    label: 'Omni'
  },
  {
    value: 'right' as const,
    icon: ArrowRight,
    title: 'First term points to second term',
    label: 'Right'
  }
];

export function CardinalityToggle({
  value,
  onChange,
  isDarkMode,
  disabled = false,
  isInGraph = false,
  onToggleGraph,
}: CardinalityToggleProps) {
  const handleToggle = (newValue: CardinalityType) => {
    if (disabled) return;

    // If not in graph, add it first
    if (!isInGraph && onToggleGraph) {
      onToggleGraph();
    }

    // Handle cardinality change
    const nextValue = value === newValue ? null : newValue;

    // If setting to null and we were the only cardinality, remove from graph
    if (nextValue === null && onToggleGraph) {
      onToggleGraph();
    }

    onChange(nextValue);
  };

  return (
    <div className={`
      inline-flex rounded-md overflow-hidden border
      ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}
      ${value === null && !isInGraph ? 'opacity-50' : ''}
    `}>
      {cardinalityOptions.map((option, index) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => handleToggle(option.value)}
            disabled={disabled}
            title={option.title}
            className={`
              relative flex items-center justify-center
              w-5 h-4 transition-all duration-150
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${isSelected
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
              ${index === 0 ? 'rounded-l-md' : ''}
              ${index === cardinalityOptions.length - 1 ? 'rounded-r-md' : ''}
              ${index !== 0 && index !== cardinalityOptions.length - 1 ? 'border-x' : ''}
              ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}
            `}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
