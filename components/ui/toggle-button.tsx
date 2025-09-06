'use client';

interface ToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  activeIcon: React.ElementType;
  inactiveIcon: React.ElementType;
  title: string;
  isDarkMode?: boolean;
}

export function ToggleButton({
  isActive,
  onClick,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  title,
  isDarkMode = false,
}: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-0.5 px-2 text-sm transition-opacity hover:opacity-80 ${
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
      {isActive ? <ActiveIcon size={16} /> : <InactiveIcon size={16} />}
    </button>
  );
}