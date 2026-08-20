import { describe, expect, it } from 'vitest';
import {
  analyzeFileImpact,
  analyzeSymbolImpact,
  buildRiskFactors,
  computeImpactConfidence,
  computeRisk,
  isTestFile,
  mergePullRisks
} from './impactAnalysis';

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

describe('buildRiskFactors / confidence', () => {
  it('surfaces missing tests as a danger factor', () => {
    const factors = buildRiskFactors({
      directCount: 3,
      transitiveCount: 4,
      testCount: 0,
      hotspotScore: 20,
      coChangeCount: 2
    });
    expect(factors.some((f) => f.id === 'tests' && f.severity === 'danger')).toBe(true);
    expect(
      computeImpactConfidence({
        directCount: 3,
        transitiveCount: 4,
        testCount: 0,
        hasHotspot: true
      })
    ).toBe('MEDIUM');
  });
});

describe('mergePullRisks', () => {
  it('takes the maximum risk across changed files', () => {
    expect(mergePullRisks(['LOW', 'MEDIUM', 'LOW'])).toBe('MEDIUM');
    expect(mergePullRisks(['MEDIUM', 'HIGH'])).toBe('HIGH');
    expect(mergePullRisks([])).toBe('LOW');
  });
});

describe('analyzeSymbolImpact', () => {
  it('is exported for symbol impact mode', () => {
    expect(typeof analyzeSymbolImpact).toBe('function');
  });
});
