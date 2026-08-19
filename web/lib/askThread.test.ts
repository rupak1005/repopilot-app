import { afterEach, describe, expect, it } from 'vitest';
import {
  askStorageKey,
  clearAskThread,
  loadAskThread,
  saveAskThread,
  type AskMessage
} from './askThread';

describe('askThread storage', () => {
  const repoId = 'test-repo-id';

  afterEach(() => {
    clearAskThread(repoId);
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
