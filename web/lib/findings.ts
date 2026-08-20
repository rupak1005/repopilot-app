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

export function listFindingCategories(findings: RepoFinding[]): string[] {
  const set = new Set<string>();
  for (const finding of findings) {
    const category = finding.category?.trim();
    if (category) set.add(category);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function parseFindingsCategory(
  value: string | string[] | undefined,
  allowed: string[]
): string | null {
  if (typeof value !== 'string') return null;
  const category = value.trim();
  if (!category || category === 'ALL') return null;
  return allowed.includes(category) ? category : null;
}

export function parseFindingsQuery(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function filterFindingsByCategory(
  findings: RepoFinding[],
  category: string | null
): RepoFinding[] {
  if (!category) return findings;
  return findings.filter((finding) => finding.category === category);
}

export function filterFindingsByQuery(findings: RepoFinding[], query: string): RepoFinding[] {
  const q = query.trim().toLowerCase();
  if (!q) return findings;
  return findings.filter((finding) => {
    const haystack = [
      finding.title,
      finding.description,
      finding.category,
      finding.pullTitle,
      String(finding.pullNumber),
      ...finding.evidence.map((item) => item.file)
    ]
      .join('\n')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function applyFindingsBoardFilters(
  findings: RepoFinding[],
  opts: { severity: FindingSeverityFilter; category: string | null; query: string }
): RepoFinding[] {
  return filterFindingsByQuery(
    filterFindingsByCategory(filterRepoFindings(findings, opts.severity), opts.category),
    opts.query
  );
}
