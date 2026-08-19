export function formatLatency(ms: number | null): string {
  if (ms == null) return 'n/a';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function hotspotScoreClass(score: number): string {
  if (score >= 80) return 'var(--status-fail)';
  if (score >= 50) return 'var(--status-warn)';
  return 'var(--primary)';
}
