import { describe, expect, it } from 'vitest';
import {
  compareFindingFingerprints,
  evaluateReviewOutcome,
  findingFingerprint,
  parseReviewPolicy
} from './reviewPolicy';

describe('parseReviewPolicy', () => {
  it('uses defaults when config is missing', () => {
    const policy = parseReviewPolicy(undefined);
    expect(policy.enabled).toBe(true);
    expect(policy.failOn).toContain('CRITICAL');
  });

  it('parses fail and warn severities from yaml', () => {
    const policy = parseReviewPolicy(`
review:
  enabled: true
  severity:
    fail: [CRITICAL]
    warn: [HIGH]
`);
    expect(policy.failOn).toEqual(['CRITICAL']);
    expect(policy.warnOn).toEqual(['HIGH']);
  });
});

describe('evaluateReviewOutcome', () => {
  it('returns FAIL when a configured severity is present', () => {
    const outcome = evaluateReviewOutcome({
      findings: [
        {
          title: 'Bug',
          severity: 'HIGH',
          category: 'correctness',
          confidence: 'HIGH'
        }
      ],
      policy: parseReviewPolicy('fail: [HIGH]')
    });
    expect(outcome).toBe('FAIL');
  });

  it('returns PASS when only low-confidence findings exist', () => {
    const outcome = evaluateReviewOutcome({
      findings: [
        {
          title: 'Maybe',
          severity: 'HIGH',
          category: 'style',
          confidence: 'LOW'
        }
      ]
    });
    expect(outcome).toBe('PASS');
  });
});

describe('finding fingerprints', () => {
  it('creates stable fingerprints and compares review runs', () => {
    const fingerprint = findingFingerprint({
      category: 'testing',
      title: 'Missing test',
      evidence: [{ file: 'src/a.ts', lines: [1, 3] }]
    });

    const comparison = compareFindingFingerprints({
      current: [fingerprint, 'other:new'],
      previous: [fingerprint, 'other:old']
    });

    expect(comparison.persistent).toEqual([fingerprint]);
    expect(comparison.newFindings).toEqual(['other:new']);
    expect(comparison.resolved).toEqual(['other:old']);
  });
});
