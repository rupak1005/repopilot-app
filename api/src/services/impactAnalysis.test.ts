import { describe, expect, it } from 'vitest';
import { analyzeFileImpact } from './impactAnalysis';

describe('analyzeFileImpact', () => {
  it('is exported for impact workspace route', () => {
    expect(typeof analyzeFileImpact).toBe('function');
  });
});
