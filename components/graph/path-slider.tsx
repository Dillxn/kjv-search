'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PathSliderProps {
  currentPathIndex: number;
  totalPaths: number;
  onPathChange: (index: number) => void;
  isDarkMode?: boolean;
}

export function PathSlider({
  currentPathIndex,
  totalPaths,
  onPathChange,
  isDarkMode = false,
}: PathSliderProps) {
  if (totalPaths <= 1) {
    return null;
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    onPathChange(newIndex);
  };

  const handlePrevious = () => {
    if (currentPathIndex > 0) {
      onPathChange(currentPathIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentPathIndex < totalPaths - 1) {
      onPathChange(currentPathIndex + 1);
    }
  };

  const currentPath = currentPathIndex + 1;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
      isDarkMode 
        ? 'bg-gray-800 border border-gray-600 text-gray-200' 
        : 'bg-white border border-gray-300 text-gray-800'
    } shadow-sm min-w-[200px]`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>Path</span>
        <span className="font-mono font-semibold text-xs px-2 py-1 rounded bg-opacity-20 bg-gray-500">
          {currentPath} / {totalPaths}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentPathIndex === 0}
          className={`p-1 rounded transition-colors ${
            currentPathIndex === 0
              ? 'opacity-30 cursor-not-allowed'
              : `hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} cursor-pointer`
          }`}
          title="Previous path"
        >
          <ChevronLeft size={12} />
        </button>
        
        <button
          onClick={handleNext}
          disabled={currentPathIndex === totalPaths - 1}
          className={`p-1 rounded transition-colors ${
            currentPathIndex === totalPaths - 1
              ? 'opacity-30 cursor-not-allowed'
              : `hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} cursor-pointer`
          }`}
          title="Next path"
        >
          <ChevronRight size={12} />
        </button>
      </div>
      
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-gray-500">Simple</span>
        <input
          type="range"
          min="0"
          max={totalPaths - 1}
          value={currentPathIndex}
          onChange={handleSliderChange}
          className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${
            isDarkMode
              ? 'bg-gray-700 slider-dark'
              : 'bg-gray-200 slider-light'
          }`}
          style={{
            background: isDarkMode
              ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentPathIndex / (totalPaths - 1)) * 100}%, #374151 ${(currentPathIndex / (totalPaths - 1)) * 100}%, #374151 100%)`
              : `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentPathIndex / (totalPaths - 1)) * 100}%, #e5e7eb ${(currentPathIndex / (totalPaths - 1)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <span className="text-xs text-gray-500">Complex</span>
      </div>
      
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider-dark::-webkit-slider-thumb {
          border: 2px solid #1f2937;
        }
        
        .slider-dark::-moz-range-thumb {
          border: 2px solid #1f2937;
        }
      `}</style>
    </div>
  );
}