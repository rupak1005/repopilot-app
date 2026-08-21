import { describe, expect, it } from 'vitest';
import { nextIndexFloatStartedFor, shouldAutoStartIndexFloat } from './indexProgressFloatGate';

describe('shouldAutoStartIndexFloat', () => {
  it('starts once when indexing begins and no float is open', () => {
    expect(
      shouldAutoStartIndexFloat({
        demoMode: false,
        repoId: 'r1',
        indexing: true,
        startedFor: null,
        activeJobRepoId: null
      })
    ).toBe(true);
  });

  it('does not restart after dismiss during the same indexing run', () => {
    expect(
      shouldAutoStartIndexFloat({
        demoMode: false,
        repoId: 'r1',
        indexing: true,
        startedFor: 'r1',
        activeJobRepoId: null
      })
    ).toBe(false);
  });

  it('allows a new float after indexing leaves and returns', () => {
    expect(nextIndexFloatStartedFor({ demoMode: false, repoId: 'r1', indexing: false, startedFor: 'r1' })).toBe(
      null
    );
    expect(
      shouldAutoStartIndexFloat({
        demoMode: false,
        repoId: 'r1',
        indexing: true,
        startedFor: null,
        activeJobRepoId: null
      })
    ).toBe(true);
  });
});
