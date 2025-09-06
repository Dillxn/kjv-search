'use client';

import { ReactNode } from 'react';

interface TabProps {
  isActive: boolean;
  isDarkMode: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: 'simple' | 'complex';
}

export function Tab({
  isActive,
  isDarkMode,
  onClick,
  children,
  className = '',
  title,
  variant = 'simple',
}: TabProps) {
  const baseClasses = `text-xs font-medium rounded-sm cursor-pointer transition-all duration-200 ${
    isActive
      ? isDarkMode
        ? 'bg-gray-700 text-white border-b-2 border-blue-400'
        : 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
      : isDarkMode
      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
  } ${className}`;

  if (variant === 'simple') {
    return (
      <button
        onClick={onClick}
        className={`px-3 py-1 ${baseClasses}`}
        title={title}
      >
        {children}
      </button>
    );
  }

  // Complex variant for main tabs with additional functionality
  return (
    <div
      className={`group relative flex items-center gap-1 px-2 py-1 min-w-0 max-w-48 ${baseClasses}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
