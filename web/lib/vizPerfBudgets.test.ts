import { describe, expect, it } from 'vitest';
import { evaluateVizPerf, VIZ_PERF_BUDGETS } from './vizPerfBudgets';

describe('evaluateVizPerf', () => {
  it('marks healthy idle stats ok', () => {
    const report = evaluateVizPerf(
      { fps: 58, frameMs: 14, nodes: 60, drawCalls: 40 },
      'near'
    );
    expect(report.overall).toBe('ok');
    expect(report.fps).toBe('ok');
  });

  it('warns on low FPS and large graphs', () => {
    const report = evaluateVizPerf(
      { fps: 36, frameMs: 28, nodes: 500, drawCalls: 200 },
      'medium'
    );
    expect(report.fps).toBe('warn');
    expect(report.frame).toBe('warn');
    expect(report.scale).toBe('warn');
    expect(report.overall).toBe('warn');
  });

  it('fails when draw calls blow past far LOD cap', () => {
    const report = evaluateVizPerf(
      {
        fps: 50,
        frameMs: 16,
        nodes: 100,
        drawCalls: VIZ_PERF_BUDGETS.drawCallsFarMax * 2
      },
      'far'
    );
    expect(report.draws).toBe('fail');
    expect(report.overall).toBe('fail');
  });
});
