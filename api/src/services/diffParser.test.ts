import { describe, expect, it } from 'vitest';
import { buildFileChange, parseUnifiedDiff } from './diffParser';

describe('parseUnifiedDiff', () => {
  it('parses added and removed lines with line numbers', () => {
    const patch = [
      '@@ -1,3 +1,4 @@',
      ' context',
      '-removed',
      '+added',
      ' trailing'
    ].join('\n');

    const hunks = parseUnifiedDiff(patch);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]?.oldStart).toBe(1);
    expect(hunks[0]?.newStart).toBe(1);
    expect(hunks[0]?.lines).toEqual([
      { type: 'context', content: 'context', oldLine: 1, newLine: 1 },
      { type: 'removed', content: 'removed', oldLine: 2 },
      { type: 'added', content: 'added', newLine: 2 },
      { type: 'context', content: 'trailing', oldLine: 3, newLine: 3 }
    ]);
  });
});

describe('buildFileChange', () => {
  it('counts additions and deletions', () => {
    const change = buildFileChange({
      path: 'src/example.ts',
      status: 'modified',
      patch: '@@ -1,2 +1,2 @@\n-old\n+new\n'
    });

    expect(change.additions).toBe(1);
    expect(change.deletions).toBe(1);
    expect(change.path).toBe('src/example.ts');
  });
});
