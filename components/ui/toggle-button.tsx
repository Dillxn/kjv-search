'use client';

import { IconButton } from './button';

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
    <IconButton
      isActive={isActive}
      onClick={onClick}
      title={title}
      isDarkMode={isDarkMode}
      className="hover:opacity-80"
    >
      {isActive ? <ActiveIcon size={16} /> : <InactiveIcon size={16} />}
    </IconButton>
  );
}