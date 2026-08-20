import type { HotspotRow } from './types';

export type TopoCell = {
  id: string;
  kind: 'cluster' | 'file';
  label: string;
  score: number;
  changeCount: number;
  memberCount: number;
  /** Grid column 0..cols-1 */
  col: number;
  /** Grid row 0..rows-1 */
  row: number;
  /** Visual weight 1–4 */
  weight: number;
  files: HotspotRow[];
};

export function topographyClusterKey(filePath: string): string {
  const slash = filePath.indexOf('/');
  if (slash <= 0) return '__root__';
  return filePath.slice(0, slash);
}

function weightForScore(score: number, maxScore: number): number {
  if (maxScore <= 0) return 1;
  const ratio = score / maxScore;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

/**
 * 2D topography layout: cluster hotspots by top-level directory into a dense grid.
 * Size encodes relative hotspot score — not decorative 3D.
 */
export function layoutTopography(
  hotspots: HotspotRow[],
  opts?: { columns?: number }
): TopoCell[] {
  if (hotspots.length === 0) return [];

  const columns = Math.max(2, opts?.columns ?? 4);
  const byCluster = new Map<string, HotspotRow[]>();
  for (const row of hotspots) {
    const key = topographyClusterKey(row.filePath);
    const list = byCluster.get(key) ?? [];
    list.push(row);
    byCluster.set(key, list);
  }

  const clusters = Array.from(byCluster.entries())
    .map(([key, files]) => {
      const sorted = [...files].sort((a, b) => b.score - a.score);
      const score = Math.max(...sorted.map((f) => f.score));
      const changeCount = sorted.reduce((sum, f) => sum + f.changeCount, 0);
      return { key, files: sorted, score, changeCount };
    })
    .sort((a, b) => b.score - a.score);

  const maxScore = clusters[0]?.score ?? 0;

  return clusters.map((cluster, index) => ({
    id: `topo:${cluster.key}`,
    kind: 'cluster' as const,
    label: cluster.key === '__root__' ? 'root' : cluster.key,
    score: cluster.score,
    changeCount: cluster.changeCount,
    memberCount: cluster.files.length,
    col: index % columns,
    row: Math.floor(index / columns),
    weight: weightForScore(cluster.score, maxScore),
    files: cluster.files
  }));
}

export function topographyRiskTone(score: number): 'low' | 'medium' | 'high' {
  if (score >= 40) return 'high';
  if (score >= 15) return 'medium';
  return 'low';
}
