import { describe, expect, it } from 'vitest';
import { REPO_PILOT_DIFFERENTIATORS } from './differentiators';

describe('REPO_PILOT_DIFFERENTIATORS', () => {
  it('lists unique capability cards with dashboard paths', () => {
    const ids = REPO_PILOT_DIFFERENTIATORS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(REPO_PILOT_DIFFERENTIATORS.length).toBeGreaterThanOrEqual(5);
    expect(REPO_PILOT_DIFFERENTIATORS.every((item) => item.path?.startsWith('/'))).toBe(true);
  });
});
