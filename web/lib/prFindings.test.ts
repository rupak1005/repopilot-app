import { describe, expect, it } from 'vitest';
import {
  countFindingsBySeverity,
  filterFindingsBySeverity,
  findingSeverityBucket
} from './prFindings';
import type { ReviewFinding } from './types';

function finding(severity: string, title = severity): ReviewFinding {
  return {
    title,
    severity,
    confidence: 'HIGH',
    category: 'correctness',
    description: 'x',
    evidence: []
  };
}

describe('prFindings', () => {
  it('buckets critical with high', () => {
    expect(findingSeverityBucket('CRITICAL')).toBe('HIGH');
    expect(findingSeverityBucket('high')).toBe('HIGH');
    expect(findingSeverityBucket('MEDIUM')).toBe('MEDIUM');
    expect(findingSeverityBucket('info')).toBe('LOW');
  });

  it('filters and counts by severity', () => {
    const findings = [finding('HIGH', 'a'), finding('CRITICAL', 'b'), finding('LOW', 'c')];
    expect(filterFindingsBySeverity(findings, 'HIGH')).toHaveLength(2);
    expect(countFindingsBySeverity(findings)).toEqual({
      ALL: 3,
      HIGH: 2,
      MEDIUM: 0,
      LOW: 1
    });
  });
});
