import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  applyTheme,
  getDomTheme,
  getStoredTheme,
  hasExplicitThemePreference,
  syncThemeFromSystem
} from './theme';

describe('theme', () => {
  const store: Record<string, string> = {};
  const dataset: Record<string, string> = {};
  const style: { colorScheme?: string } = {};
  const metas: Array<{ name: string; content: string }> = [];

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    for (const k of Object.keys(dataset)) delete dataset[k];
    style.colorScheme = undefined;
    metas.length = 0;

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
    vi.stubGlobal('document', {
      documentElement: {
        dataset,
        style
      },
      head: {
        appendChild(node: { getAttribute: (n: string) => string | null; setAttribute: (n: string, v: string) => void }) {
          metas.push({
            name: node.getAttribute('name') ?? '',
            content: node.getAttribute('content') ?? ''
          });
        }
      },
      querySelector(selector: string) {
        if (selector === 'meta[name="theme-color"]') {
          const existing = metas.find((m) => m.name === 'theme-color');
          if (!existing) return null;
          return {
            getAttribute: (n: string) => (n === 'name' ? existing.name : existing.content),
            setAttribute: (n: string, v: string) => {
              if (n === 'content') existing.content = v;
              if (n === 'name') existing.name = v;
            }
          };
        }
        return null;
      },
      createElement(tag: string) {
        const attrs: Record<string, string> = {};
        return {
          tag,
          getAttribute: (n: string) => attrs[n] ?? null,
          setAttribute: (n: string, v: string) => {
            attrs[n] = v;
          }
        };
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists dark mode in localStorage and DOM', () => {
    applyTheme('dark');
    expect(getStoredTheme()).toBe('dark');
    expect(getDomTheme()).toBe('dark');
    expect(style.colorScheme).toBe('dark');
    expect(hasExplicitThemePreference()).toBe(true);
  });

  it('persists light mode in localStorage and DOM', () => {
    applyTheme('light');
    expect(getStoredTheme()).toBe('light');
    expect(getDomTheme()).toBe('light');
    expect(style.colorScheme).toBe('light');
  });

  it('syncThemeFromSystem follows media query without storing', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: true })
    });
    expect(syncThemeFromSystem()).toBe('dark');
    expect(getDomTheme()).toBe('dark');
    expect(hasExplicitThemePreference()).toBe(false);
  });
});
