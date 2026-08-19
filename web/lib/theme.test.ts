import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { applyTheme, getStoredTheme } from './theme';

describe('theme', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      }
    });
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false })
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists dark mode in localStorage', () => {
    applyTheme('dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('persists light mode in localStorage', () => {
    applyTheme('light');
    expect(getStoredTheme()).toBe('light');
  });
});
