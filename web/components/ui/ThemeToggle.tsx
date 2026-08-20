import { Moon, Sun } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { getStoredTheme, toggleTheme, type ThemeMode } from '../../lib/theme';
import { IconButton } from './IconButton';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function handleToggle() {
    setTheme(toggleTheme());
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <IconButton className={className} label={label} onClick={handleToggle}>
      {theme === 'dark' ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
    </IconButton>
  );
}
