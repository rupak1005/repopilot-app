import type { LodBand } from './visualizationLod';

/** Desktop exploration budgets for the Gate D viz spike (manual + overlay). */
export const VIZ_PERF_BUDGETS = {
  /** Comfortable idle/orbit FPS after camera settles (demand frameloop). */
  fpsMinOk: 45,
  fpsMinWarn: 30,
  /** Frame time ceilings (ms). */
  frameMsMaxOk: 22,
  frameMsMaxWarn: 40,
  /** Entity-count guidance (matches 3D architecture audit). */
  nodesComfortable: 300,
  nodesClusterFirst: 2000,
  /** Draw-call soft caps by LOD (individual Line meshes are heavy). */
  drawCallsFarMax: 120,
  drawCallsNearMax: 450
} as const;

export type VizPerfBudgetInput = {
  fps: number;
  frameMs: number;
  nodes: number;
  drawCalls: number;
};

export type BudgetStatus = 'ok' | 'warn' | 'fail';

export type VizPerfBudgetReport = {
  fps: BudgetStatus;
  frame: BudgetStatus;
  scale: BudgetStatus;
  draws: BudgetStatus;
  overall: BudgetStatus;
  notes: string[];
};

function worse(a: BudgetStatus, b: BudgetStatus): BudgetStatus {
  const rank = { ok: 0, warn: 1, fail: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

export function evaluateVizPerf(
  stats: VizPerfBudgetInput,
  band: LodBand
): VizPerfBudgetReport {
  const notes: string[] = [];
  let fps: BudgetStatus = 'ok';
  if (stats.fps > 0) {
    if (stats.fps < VIZ_PERF_BUDGETS.fpsMinWarn) fps = 'fail';
    else if (stats.fps < VIZ_PERF_BUDGETS.fpsMinOk) fps = 'warn';
  }

  let frame: BudgetStatus = 'ok';
  if (stats.frameMs > 0) {
    if (stats.frameMs > VIZ_PERF_BUDGETS.frameMsMaxWarn) frame = 'fail';
    else if (stats.frameMs > VIZ_PERF_BUDGETS.frameMsMaxOk) frame = 'warn';
  }

  let scale: BudgetStatus = 'ok';
  if (stats.nodes > VIZ_PERF_BUDGETS.nodesClusterFirst) {
    scale = 'fail';
    notes.push('>2k nodes — prefer cluster-first / 2D default');
  } else if (stats.nodes > VIZ_PERF_BUDGETS.nodesComfortable) {
    scale = 'warn';
    notes.push('>300 nodes — keep label LOD + far edge culling on');
  }

  const drawCap =
    band === 'far' ? VIZ_PERF_BUDGETS.drawCallsFarMax : VIZ_PERF_BUDGETS.drawCallsNearMax;
  let draws: BudgetStatus = 'ok';
  if (stats.drawCalls > drawCap * 1.5) {
    draws = 'fail';
    notes.push(`Draw calls high for ${band} LOD — batch edges next`);
  } else if (stats.drawCalls > drawCap) {
    draws = 'warn';
    notes.push(`Draw calls above ${band} soft cap (${drawCap})`);
  }

  const overall = [fps, frame, scale, draws].reduce(worse, 'ok' as BudgetStatus);
  if (overall === 'ok' && notes.length === 0) {
    notes.push('Within desktop exploration budgets');
  }

  return { fps, frame, scale, draws, overall, notes };
}
