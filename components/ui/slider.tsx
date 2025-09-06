'use client';

import { getTextClass } from '../../lib/theme-utils';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  isDarkMode: boolean;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  isDarkMode,
  className = '',
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
          <label className={`text-xs font-medium ${getTextClass(isDarkMode, 'secondary')}`}>
            {label}
          </label>
          <span className={`text-xs ${getTextClass(isDarkMode, 'secondary')}`}>
            {value === 0 ? 'Same verse only' : value === 1 ? '1 verse apart' : `${value} verses apart`}
          </span>
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={`
            w-full h-2 rounded-lg appearance-none cursor-pointer
            ${isDarkMode 
              ? 'bg-gray-700 slider-thumb-dark' 
              : 'bg-gray-200 slider-thumb-light'
            }
          `}
          style={{
            background: isDarkMode
              ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #374151 ${percentage}%, #374151 100%)`
              : `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />
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
          
          input[type="range"]:focus {
            outline: none;
          }
          
          input[type="range"]:focus::-webkit-slider-thumb {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
          }
          
          input[type="range"]:focus::-moz-range-thumb {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
          }
        `}</style>
      </div>
    </div>
  );
}