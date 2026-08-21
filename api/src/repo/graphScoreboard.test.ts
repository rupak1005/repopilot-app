import { describe, expect, it } from 'vitest';
import {
  GATE_A_SCORE_FLOORS,
  scoreModuleResolves,
  scoreSymbolResolves
} from './graphScoreboard';
import { MODULE_RESOLVE_LABELS, SYMBOL_RESOLVE_LABELS } from './graphScoreboard.fixtures';

describe('Gate A graph scoreboard', () => {
  it('meets module-resolve precision/recall floors', () => {
    const metrics = scoreModuleResolves(MODULE_RESOLVE_LABELS);
    expect(metrics.precision).toBeGreaterThanOrEqual(GATE_A_SCORE_FLOORS.modulePrecision);
    expect(metrics.recall).toBeGreaterThanOrEqual(GATE_A_SCORE_FLOORS.moduleRecall);
    expect(metrics.unresolvedAccuracy).toBeGreaterThanOrEqual(
      GATE_A_SCORE_FLOORS.moduleUnresolvedAccuracy
    );
  });

  it('meets symbol-resolve (barrel/re-export) precision/recall floors', () => {
    const metrics = scoreSymbolResolves(SYMBOL_RESOLVE_LABELS);
    expect(metrics.precision).toBeGreaterThanOrEqual(GATE_A_SCORE_FLOORS.symbolPrecision);
    expect(metrics.recall).toBeGreaterThanOrEqual(GATE_A_SCORE_FLOORS.symbolRecall);
    expect(metrics.unresolvedAccuracy).toBeGreaterThanOrEqual(
      GATE_A_SCORE_FLOORS.symbolUnresolvedAccuracy
    );
  });
});
