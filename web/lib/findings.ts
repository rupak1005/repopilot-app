import type { ReviewFinding } from './types';
import {
  countFindingsBySeverity,
  filterFindingsBySeverity,
  type FindingSeverityFilter
} from './prFindings';

export type RepoFinding = ReviewFinding & {
  id: string;
  pullNumber: number;
  pullTitle: string;
  headRevision?: string;
};

export function parseFindingsSeverity(
  value: string | string[] | undefined
): FindingSeverityFilter {
  if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW' || value === 'ALL') return value;
  return 'ALL';
}

export function sortFindingsBySeverity(findings: RepoFinding[]): RepoFinding[] {
  const rank = (severity: string) => {
    const s = severity.toUpperCase();
    if (s === 'CRITICAL' || s === 'HIGH') return 0;
    if (s === 'MEDIUM') return 1;
    return 2;
  };
  return [...findings].sort((a, b) => {
    const diff = rank(a.severity) - rank(b.severity);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });
}

export function filterRepoFindings(
  findings: RepoFinding[],
  filter: FindingSeverityFilter
): RepoFinding[] {
  return filterFindingsBySeverity(findings, filter) as RepoFinding[];
}

export function countRepoFindings(findings: RepoFinding[]) {
  return countFindingsBySeverity(findings);
}

export const FINDING_SEVERITY_FILTERS: FindingSeverityFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
