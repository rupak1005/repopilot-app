import type { ReviewFinding } from './types';

export type FindingSeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

const HIGH = new Set(['CRITICAL', 'HIGH']);

export function findingSeverityBucket(severity: string): Exclude<FindingSeverityFilter, 'ALL'> {
  const s = severity.toUpperCase();
  if (HIGH.has(s)) return 'HIGH';
  if (s === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

export function filterFindingsBySeverity(
  findings: ReviewFinding[],
  filter: FindingSeverityFilter
): ReviewFinding[] {
  if (filter === 'ALL') return findings;
  return findings.filter((f) => findingSeverityBucket(f.severity) === filter);
}

export function countFindingsBySeverity(findings: ReviewFinding[]): Record<FindingSeverityFilter, number> {
  const counts: Record<FindingSeverityFilter, number> = {
    ALL: findings.length,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };
  for (const f of findings) {
    counts[findingSeverityBucket(f.severity)] += 1;
  }
  return counts;
}
