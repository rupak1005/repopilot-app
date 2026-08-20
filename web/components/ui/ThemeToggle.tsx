import { Moon, Sun } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { getDomTheme, toggleTheme, type ThemeMode } from '../../lib/theme';
import { IconButton } from './IconButton';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    typeof document !== 'undefined' ? getDomTheme() : 'light'
  );

  useEffect(() => {
    setTheme(getDomTheme());
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(getDomTheme());
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  function handleToggle() {
    setTheme(toggleTheme());
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <IconButton className={className} label={label} onClick={handleToggle} aria-pressed={theme === 'dark'}>
      {theme === 'dark' ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
    </IconButton>
  );
}
