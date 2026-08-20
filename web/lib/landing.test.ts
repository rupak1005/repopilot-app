import { describe, expect, it } from 'vitest';
import { LANDING_BRAND, LANDING_HOW_IT_WORKS, LANDING_HEADLINE } from './landing';

describe('landing copy', () => {
  it('keeps brand and how-it-works spine', () => {
    expect(LANDING_BRAND).toBe('RepoPilot');
    expect(LANDING_HEADLINE.toLowerCase()).toContain('evidence');
    expect(LANDING_HOW_IT_WORKS).toHaveLength(3);
    expect(LANDING_HOW_IT_WORKS.map((s) => s.id)).toEqual(['paste', 'index', 'investigate']);
  });
});
