import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  askStorageKey,
  clearAskThread,
  loadAskThread,
  saveAskThread,
  type AskMessage
} from './askThread';

describe('askThread storage', () => {
  const repoId = 'test-repo-id';
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      }
    });
  });

  afterEach(() => {
    clearAskThread(repoId);
    vi.unstubAllGlobals();
  });

  it('round-trips messages for a repo', () => {
    const messages: AskMessage[] = [
      { id: '1', role: 'user', text: 'hi' },
      {
        id: '2',
        role: 'assistant',
        response: { answer: 'hello', confidence: 'HIGH', citations: [] }
      }
    ];
    saveAskThread(repoId, messages);
    expect(loadAskThread(repoId)).toEqual(messages);
  });

  it('uses repo-scoped keys', () => {
    expect(askStorageKey(repoId)).toBe('repopilot:ask:test-repo-id');
  });
});
