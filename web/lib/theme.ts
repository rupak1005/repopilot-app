export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'repopilot-theme';

const THEME_COLORS: Record<ThemeMode, string> = {
  light: '#f3e8ff',
  dark: '#100e18'
};

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

/** True when the user explicitly picked a theme (not system default). */
export function hasExplicitThemePreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light';
  } catch {
    return false;
  }
}

export function getDomTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', THEME_COLORS[mode]);
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
  const next = getDomTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/** Follow OS preference when the user has not explicitly chosen. Does not write localStorage. */
export function syncThemeFromSystem(): ThemeMode {
  const mode =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[mode]);
  }
  return mode;
}

/** Inline script for _document — prevents theme flash */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${STORAGE_KEY}';var t=localStorage.getItem(k);var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var mode=dark?'dark':'light';var r=document.documentElement;r.dataset.theme=mode;r.style.colorScheme=mode;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',dark?'${THEME_COLORS.dark}':'${THEME_COLORS.light}');}catch(e){}})();`;
