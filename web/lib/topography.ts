import type { HotspotRow } from './types';

export type TopoMetric = 'score' | 'changeCount' | 'dependentCount' | 'findingsCount';

export const TOPO_METRICS: Array<{ id: TopoMetric; label: string }> = [
  { id: 'score', label: 'Hotspot score' },
  { id: 'changeCount', label: 'Churn' },
  { id: 'dependentCount', label: 'Dependents' },
  { id: 'findingsCount', label: 'Findings' }
];

export const TOPO_WINDOWS = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 365, label: '1y' }
] as const;

export type TopoWindowDays = (typeof TOPO_WINDOWS)[number]['days'];

export function parseTopoWindowDays(raw?: string | number | null): TopoWindowDays {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (TOPO_WINDOWS.some((w) => w.days === n)) return n as TopoWindowDays;
  return 30;
}

/** Demo-only: scale 30d fixtures toward the selected lookback. */
export function scaleHotspotsForWindow(rows: HotspotRow[], windowDays: TopoWindowDays): HotspotRow[] {
  const factor = windowDays / 30;
  return rows
    .map((row) => ({
      ...row,
      changeCount: Math.max(0, Math.round(row.changeCount * factor)),
      score: Math.round(row.score * factor * 10) / 10
    }))
    .sort((a, b) => b.score - a.score);
}

export type TopoCell = {
  id: string;
  kind: 'cluster' | 'file';
  label: string;
  /** Metric value used for sizing/ranking. */
  value: number;
  score: number;
  changeCount: number;
  dependentCount: number;
  findingsCount: number;
  memberCount: number;
  col: number;
  row: number;
  weight: number;
  files: HotspotRow[];
};

export function topographyClusterKey(filePath: string): string {
  const slash = filePath.indexOf('/');
  if (slash <= 0) return '__root__';
  return filePath.slice(0, slash);
}

export function hotspotMetricValue(row: HotspotRow, metric: TopoMetric): number {
  switch (metric) {
    case 'changeCount':
      return row.changeCount ?? 0;
    case 'dependentCount':
      return row.dependentCount ?? 0;
    case 'findingsCount':
      return row.findingsCount ?? 0;
    case 'score':
    default:
      return row.score ?? 0;
  }
}

function weightForValue(value: number, maxValue: number): number {
  if (maxValue <= 0) return 1;
  const ratio = value / maxValue;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

/**
 * 2D topography layout: cluster hotspots by top-level directory into a dense grid.
 * Size encodes the selected metric — not decorative 3D.
 */
export function layoutTopography(
  hotspots: HotspotRow[],
  opts?: { columns?: number; metric?: TopoMetric }
): TopoCell[] {
  if (hotspots.length === 0) return [];

  const columns = Math.max(2, opts?.columns ?? 4);
  const metric = opts?.metric ?? 'score';
  const byCluster = new Map<string, HotspotRow[]>();
  for (const row of hotspots) {
    const key = topographyClusterKey(row.filePath);
    const list = byCluster.get(key) ?? [];
    list.push(row);
    byCluster.set(key, list);
  }

  const clusters = Array.from(byCluster.entries())
    .map(([key, files]) => {
      const sorted = [...files].sort(
        (a, b) => hotspotMetricValue(b, metric) - hotspotMetricValue(a, metric)
      );
      const value = Math.max(...sorted.map((f) => hotspotMetricValue(f, metric)));
      const score = Math.max(...sorted.map((f) => f.score));
      const changeCount = sorted.reduce((sum, f) => sum + f.changeCount, 0);
      const dependentCount = sorted.reduce((sum, f) => sum + (f.dependentCount ?? 0), 0);
      const findingsCount = sorted.reduce((sum, f) => sum + (f.findingsCount ?? 0), 0);
      return { key, files: sorted, value, score, changeCount, dependentCount, findingsCount };
    })
    .sort((a, b) => b.value - a.value);

  const maxValue = clusters[0]?.value ?? 0;

  return clusters.map((cluster, index) => ({
    id: `topo:${cluster.key}`,
    kind: 'cluster' as const,
    label: cluster.key === '__root__' ? 'root' : cluster.key,
    value: cluster.value,
    score: cluster.score,
    changeCount: cluster.changeCount,
    dependentCount: cluster.dependentCount,
    findingsCount: cluster.findingsCount,
    memberCount: cluster.files.length,
    col: index % columns,
    row: Math.floor(index / columns),
    weight: weightForValue(cluster.value, maxValue),
    files: cluster.files
  }));
}

export function topographyRiskTone(score: number): 'low' | 'medium' | 'high' {
  if (score >= 40) return 'high';
  if (score >= 15) return 'medium';
  return 'low';
}
