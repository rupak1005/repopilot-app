import { describe, expect, it } from 'vitest';
import { analyzeFileImpact, computeRisk, isTestFile } from './impactAnalysis';

describe('analyzeFileImpact', () => {
  it('is exported for impact workspace route', () => {
    expect(typeof analyzeFileImpact).toBe('function');
  });
});

describe('isTestFile', () => {
  it('matches TS/JS, Python, and Go test paths', () => {
    expect(isTestFile('web/lib/seo.test.ts')).toBe(true);
    expect(isTestFile('pkg/auth_test.go')).toBe(true);
    expect(isTestFile('tests/test_router.py')).toBe(true);
    expect(isTestFile('api/src/services/impactAnalysis.ts')).toBe(false);
  });
});

describe('computeRisk', () => {
  it('raises risk when a non-trivial blast radius has no tests', () => {
    expect(
      computeRisk({ directCount: 2, transitiveCount: 0, hotspotScore: 0, testCount: 1 })
    ).toBe('MEDIUM');
    expect(
      computeRisk({ directCount: 2, transitiveCount: 0, hotspotScore: 0, testCount: 0 })
    ).toBe('HIGH');
  });
});
