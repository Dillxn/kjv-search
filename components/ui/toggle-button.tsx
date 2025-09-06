'use client';

interface ToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  activeIcon: string;
  inactiveIcon: string;
  title: string;
  isDarkMode?: boolean;
}

export function ToggleButton({
  isActive,
  onClick,
  activeIcon,
  inactiveIcon,
  title,
  isDarkMode = false,
}: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-0.5 rounded-full text-sm transition-opacity hover:opacity-80 ${
        isActive
          ? isDarkMode
            ? 'bg-slate-600 text-white'
            : 'bg-blue-500 text-white'
          : isDarkMode
          ? 'bg-gray-700 text-gray-400'
          : 'bg-gray-200 text-gray-600'
      }`}
      title={title}
    >
      {isActive ? activeIcon : inactiveIcon}
    </button>
  );
}