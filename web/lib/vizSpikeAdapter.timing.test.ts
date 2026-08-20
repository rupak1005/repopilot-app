import { describe, expect, it } from 'vitest';
import { buildArchitectureView } from './architecture';
import { layoutWithDagre } from './dagreLayout';
import { ensureSpikeNodeCount } from './visualizationLod';
import { visualizationFromLaidOutForceGraph } from './visualizationModel';

function project(n: number) {
  const nodes = Array.from({ length: n }, (_, i) => ({
    filePath: `p/${i}.ts`,
    isHotspot: i % 20 === 0,
    score: (i * 7) % 100
  }));
  const edges = Array.from({ length: Math.max(0, n - 1) }, (_, i) => ({
    fromModule: `p/${i}.ts`,
    toModule: `p/${i + 1}.ts`,
    confidence: 1
  }));
  const t0 = performance.now();
  const view = buildArchitectureView(
    { nodes, edges },
    { clusterAbove: 9999, maxFilesPerCluster: n }
  );
  const padded = ensureSpikeNodeCount({ nodes: view.nodes, links: view.links }, n);
  const laid = layoutWithDagre(padded);
  const viz = visualizationFromLaidOutForceGraph(laid, { scale: 40 });
  return { ms: performance.now() - t0, nodes: viz.nodes.length, edges: viz.edges.length };
}

/** Keeps a runnable ceiling check for the spike adapter path (CPU only, no WebGL). */
describe('viz spike adapter timing', () => {
  it('layouts and projects small/medium/large under 500ms', () => {
    for (const n of [15, 60, 250] as const) {
      project(n); // warm
      const r = project(n);
      expect(r.nodes).toBe(n);
      expect(r.ms).toBeLessThan(500);
    }
  });
});
