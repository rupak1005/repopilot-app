import { Moon, Sun } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { getStoredTheme, toggleTheme, type ThemeMode } from '../../lib/theme';
import { IconButton } from './IconButton';

type ThemeToggleProps = {
  className?: string;
  /** Text button for public header vs icon-only in dashboard */
  variant?: 'icon' | 'pill';
};

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function handleToggle() {
    setTheme(toggleTheme());
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        className={`public-theme-toggle${className ? ` ${className}` : ''}`}
        onClick={handleToggle}
        aria-label={label}
      >
        {theme === 'dark' ? <Sun size={16} weight="bold" aria-hidden /> : <Moon size={16} weight="bold" aria-hidden />}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    );
  }

  return (
    <IconButton className={className} label={label} onClick={handleToggle}>
      {theme === 'dark' ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
    </IconButton>
  );
}
