import type { HotspotRow } from './types';

export type PlanningCandidate = {
  filePath: string;
  score: number;
  changeCount: number;
  reason: string;
};

export function planningCandidatesFromHotspots(
  hotspots: HotspotRow[],
  limit = 12
): PlanningCandidate[] {
  return [...hotspots]
    .filter((row) => Boolean(row.filePath?.trim()))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.changeCount ?? 0) - (a.changeCount ?? 0))
    .slice(0, Math.max(1, limit))
    .map((row) => ({
      filePath: row.filePath,
      score: row.score ?? 0,
      changeCount: row.changeCount ?? 0,
      reason: planningReason(row)
    }));
}

export function planningReason(row: HotspotRow): string {
  const score = row.score ?? 0;
  const changes = row.changeCount ?? 0;
  if (score >= 0.75 && changes >= 8) {
    return 'High hotspot score with sustained churn — plan blast radius before editing.';
  }
  if (score >= 0.5) {
    return 'Elevated hotspot score — check Impact dependents and tests first.';
  }
  if (changes >= 5) {
    return 'Frequent recent changes — coordinate with open PRs touching this path.';
  }
  return 'Candidate from topography ranking — confirm Impact before opening a PR.';
}

export function planningSeedFromQuery(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  return path.length > 0 ? path : null;
}
