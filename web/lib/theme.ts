export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'repopilot-theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = mode === 'dark' ? 'dark' : '';
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  } catch {
    // ponytail: private mode — theme applies for session only
  }
}

export function toggleTheme(): ThemeMode {
  const next = getStoredTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/** Inline script for _document — prevents theme flash */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='dark')document.documentElement.dataset.theme='dark';else if(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark';}catch(e){}})();`;
