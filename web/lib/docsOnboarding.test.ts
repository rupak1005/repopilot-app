import { describe, expect, it } from 'vitest';
import { ONBOARDING_STEPS, onboardingStepCount } from './docsOnboarding';

describe('docsOnboarding', () => {
  it('covers open → index → explore → agents', () => {
    expect(onboardingStepCount()).toBe(5);
    expect(ONBOARDING_STEPS.map((s) => s.id)).toEqual([
      'open',
      'index',
      'overview',
      'investigate',
      'agents'
    ]);
    expect(ONBOARDING_STEPS.at(-1)?.href).toBe('/docs/mcp');
  });
});
