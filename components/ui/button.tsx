import { getButtonClass } from '../../lib/theme-utils';

interface BaseButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  isDarkMode: boolean;
}

interface ButtonProps extends BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'disabled';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function Button({
  children,
  onClick,
  disabled = false,
  title,
  className = '',
  isDarkMode,
  variant = 'primary',
  size = 'md',
}: ButtonProps) {
  const baseClasses = 'rounded transition-colors';
  const variantClass = disabled ? getButtonClass(isDarkMode, 'disabled') : getButtonClass(isDarkMode, variant);
  const sizeClass = sizeClasses[size];
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function FilterButton({
  children,
  isSelected,
  onClick,
  disabled = false,
  count,
  isDarkMode,
  className = '',
}: BaseButtonProps & {
  isSelected: boolean;
  count?: number;
}) {
  const variant = isSelected ? 'primary' : 'secondary';
  const displayText = count !== undefined ? `${children} (${count})` : children;
  
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      isDarkMode={isDarkMode}
      className={className}
    >
      {displayText}
    </Button>
  );
}

export function IconButton({
  children,
  onClick,
  disabled = false,
  title,
  isActive = false,
  isDarkMode,
  className = '',
}: BaseButtonProps & {
  isActive?: boolean;
}) {
  const variant = isActive ? 'primary' : 'secondary';
  
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      isDarkMode={isDarkMode}
      className={`p-0.5 px-2 ${className}`.trim()}
    >
      {children}
    </Button>
  );
}