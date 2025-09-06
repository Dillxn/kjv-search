/**
 * Utility functions for consistent theming across components
 */

export interface ThemeClasses {
  text: {
    primary: string;
    secondary: string;
    muted: string;
    error: string;
  };
  background: {
    primary: string;
    secondary: string;
    card: string;
    input: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  button: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

export function getThemeClasses(isDarkMode: boolean): ThemeClasses {
  return {
    text: {
      primary: isDarkMode ? 'text-white' : 'text-gray-900',
      secondary: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      muted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
      error: isDarkMode ? 'text-red-400' : 'text-red-600',
    },
    background: {
      primary: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
      secondary: isDarkMode ? 'bg-gray-800' : 'bg-white',
      card: isDarkMode ? 'bg-gray-800' : 'bg-white',
      input: isDarkMode ? 'bg-gray-700' : 'bg-white',
    },
    border: {
      primary: isDarkMode ? 'border-gray-700' : 'border-gray-200',
      secondary: isDarkMode ? 'border-gray-600' : 'border-gray-300',
    },
    button: {
      primary: isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600',
      secondary: isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      disabled: isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed',
    },
  };
}

// Convenience functions for common patterns
export function getTextClass(isDarkMode: boolean, variant: keyof ThemeClasses['text'] = 'primary'): string {
  return getThemeClasses(isDarkMode).text[variant];
}

export function getBackgroundClass(isDarkMode: boolean, variant: keyof ThemeClasses['background'] = 'primary'): string {
  return getThemeClasses(isDarkMode).background[variant];
}

export function getBorderClass(isDarkMode: boolean, variant: keyof ThemeClasses['border'] = 'primary'): string {
  return getThemeClasses(isDarkMode).border[variant];
}

export function getButtonClass(isDarkMode: boolean, variant: keyof ThemeClasses['button'] = 'primary'): string {
  return getThemeClasses(isDarkMode).button[variant];
}