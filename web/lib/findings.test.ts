import { describe, expect, it } from 'vitest';
import {
  filterRepoFindings,
  parseFindingsSeverity,
  sortFindingsBySeverity,
  type RepoFinding
} from './findings';

const sample: RepoFinding[] = [
  {
    id: '1',
    pullNumber: 42,
    pullTitle: 'Pay',
    title: 'High issue',
    severity: 'HIGH',
    category: 'correctness',
    confidence: 'HIGH',
    description: 'd',
    evidence: []
  },
  {
    id: '2',
    pullNumber: 38,
    pullTitle: 'Ask',
    title: 'Low issue',
    severity: 'LOW',
    category: 'testing',
    confidence: 'LOW',
    description: 'd',
    evidence: []
  },
  {
    id: '3',
    pullNumber: 38,
    pullTitle: 'Ask',
    title: 'Medium issue',
    severity: 'MEDIUM',
    category: 'testing',
    confidence: 'MEDIUM',
    description: 'd',
    evidence: []
  }
];

describe('findings', () => {
  it('parses severity query values', () => {
    expect(parseFindingsSeverity('HIGH')).toBe('HIGH');
    expect(parseFindingsSeverity('nope')).toBe('ALL');
  });

  it('filters and sorts by severity', () => {
    expect(filterRepoFindings(sample, 'HIGH')).toHaveLength(1);
    expect(sortFindingsBySeverity(sample).map((f) => f.severity)).toEqual([
      'HIGH',
      'MEDIUM',
      'LOW'
    ]);
  });
});
