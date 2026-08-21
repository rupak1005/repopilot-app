import { describe, expect, it } from 'vitest';
import { buildImpactTestPlan } from '@repopilot/common';
import {
  loadVerifyChecked,
  saveVerifyChecked,
  verifyItemsFromTestPlan,
  verifyProgress,
  verifyStorageKey
} from './verifyChecklist';

describe('verifyItemsFromTestPlan', () => {
  it('maps each command to a checklist row', () => {
    const plan = buildImpactTestPlan([
      'api/src/a.test.ts',
      'web/lib/b.test.ts'
    ]);
    const items = verifyItemsFromTestPlan(plan);
    expect(items).toHaveLength(2);
    expect(items[0]?.command).toContain('yarn workspace');
    expect(items.some((i) => i.label.includes('@repopilot/api'))).toBe(true);
  });

  it('returns empty for missing plan', () => {
    expect(verifyItemsFromTestPlan(null)).toEqual([]);
  });
});

describe('verifyProgress', () => {
  it('counts checked items', () => {
    const items = verifyItemsFromTestPlan(
      buildImpactTestPlan(['api/src/a.test.ts', 'web/lib/b.test.ts'])
    );
    const checked = { [items[0]!.id]: true };
    expect(verifyProgress(items, checked)).toEqual({ done: 1, total: 2, complete: false });
    expect(
      verifyProgress(items, { [items[0]!.id]: true, [items[1]!.id]: true }).complete
    ).toBe(true);
  });
});

describe('verify storage', () => {
  it('round-trips checked state', () => {
    const key = verifyStorageKey('r1', 'pull:42');
    saveVerifyChecked(key, { 'cmd:root:0': true });
    expect(loadVerifyChecked(key)).toEqual({ 'cmd:root:0': true });
  });
});
