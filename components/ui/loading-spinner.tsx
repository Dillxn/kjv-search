'use client';

import { getBackgroundClass, getTextClass } from '../../lib/theme-utils';

interface LoadingSpinnerProps {
  message?: string;
  isDarkMode?: boolean;
}

export function LoadingSpinner({ message = 'Loading...', isDarkMode = false }: LoadingSpinnerProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${getBackgroundClass(isDarkMode)}`}>
      <div className='text-center'>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 mx-auto mb-1 border-blue-600"></div>
        <p className={`text-sm ${getTextClass(isDarkMode, 'secondary')}`}>
          {message}
        </p>
      </div>
    </div>
  );
}