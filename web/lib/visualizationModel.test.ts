import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from './architecture';
import type { FileImpactAnalysis } from './types';
import {
  mapMetricToHeight,
  normalizeMetric,
  riskLabelToScore,
  visualizationFromArchitecture,
  visualizationFromFileImpact,
  visualizationFromHotspots,
  visualizationFromLaidOutForceGraph,
  visualizationToForceGraphIds
} from './visualizationModel';
import { layoutWithDagre } from './dagreLayout';
import { buildArchitectureView } from './architecture';

describe('metric scales', () => {
  it('maps risk labels and normalizes outliers with sqrt', () => {
    expect(riskLabelToScore('HIGH')).toBe(90);
    expect(normalizeMetric(100, 100, 'linear')).toBe(1);
    expect(normalizeMetric(25, 100, 'sqrt')).toBeCloseTo(0.5, 5);
    expect(mapMetricToHeight(0, 10, { min: 0.2, maxHeight: 1 })).toBe(0.2);
  });
});

describe('visualizationFromArchitecture', () => {
  it('projects path nodes to file: URNs and keeps uncertain edges', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { filePath: 'api/src/a.ts', isHotspot: true, score: 80 },
        { filePath: 'web/b.tsx', isHotspot: false, score: 10 }
      ],
      edges: [{ fromModule: 'api/src/a.ts', toModule: 'web/b.tsx', confidence: 0.7, kind: 'imports' }]
    };
    const viz = visualizationFromArchitecture(graph, { revisionSha: 'abc' });
    expect(viz.revisionSha).toBe('abc');
    expect(viz.nodes.map((n) => n.id)).toEqual(['file:api/src/a.ts', 'file:web/b.tsx']);
    expect(viz.nodes[0]?.layer).toBe('api');
    expect(viz.edges).toHaveLength(1);
    expect(viz.edges[0]?.confidence).toBe(0.7);
    expect(viz.edges[0]?.evidence.some((e) => e.kind === 'uncertain')).toBe(true);

    const force = visualizationToForceGraphIds(viz);
    expect(force.nodeIds).toContain('api/src/a.ts');
    expect(force.linkPairs[0]?.uncertain).toBe(true);
  });
});

describe('visualizationFromHotspots', () => {
  it('adds cluster landmarks and metric Z height', () => {
    const viz = visualizationFromHotspots(
      [
        {
          filePath: 'api/src/server.ts',
          score: 90,
          changeCount: 12,
          reasons: ['churn'],
          dependentCount: 8
        },
        {
          filePath: 'web/pages/index.tsx',
          score: 20,
          changeCount: 2,
          reasons: [],
          dependentCount: 1
        }
      ],
      { metric: 'score' }
    );
    expect(viz.nodes.some((n) => n.id === 'cluster:api' && n.entityType === 'cluster')).toBe(true);
    expect(viz.nodes.some((n) => n.id === 'cluster:web')).toBe(true);
    const apiFile = viz.nodes.find((n) => n.path === 'api/src/server.ts');
    const webFile = viz.nodes.find((n) => n.path === 'web/pages/index.tsx');
    expect(apiFile?.position?.z ?? 0).toBeGreaterThan(webFile?.position?.z ?? 0);
    expect(viz.edges).toHaveLength(0);
  });
});

describe('visualizationFromFileImpact', () => {
  it('encodes blast layers on Z and draws impact edges', () => {
    const impact: FileImpactAnalysis = {
      target: { filePath: 'api/src/pay.ts' },
      revisionSha: 'deadbeef',
      risk: 'HIGH',
      confidence: 'HIGH',
      riskFactors: [],
      directDependents: ['api/src/order.ts'],
      transitiveDependents: ['web/checkout.tsx'],
      outboundImports: ['api/src/db.ts'],
      relevantTests: [{ filePath: 'api/src/pay.test.ts', reason: 'covers pay', confidence: 'HIGH' }],
      coChanges: [],
      hotspot: { score: 70, changeCount: 9, reasons: [] },
      checklist: [],
      summary: 'High blast radius around pay.ts'
    };
    const viz = visualizationFromFileImpact(impact);
    expect(viz.revisionSha).toBe('deadbeef');
    expect(viz.nodes.find((n) => n.path === 'api/src/pay.ts')?.blastRole).toBe('seed');
    expect(viz.nodes.find((n) => n.path === 'api/src/pay.ts')?.position?.z).toBe(0);
    expect(viz.nodes.find((n) => n.path === 'api/src/order.ts')?.position?.z).toBe(1);
    expect(viz.nodes.find((n) => n.path === 'web/checkout.tsx')?.position?.z).toBe(2);
    expect(viz.nodes.find((n) => n.entityType === 'test')?.path).toBe('api/src/pay.test.ts');
    expect(viz.edges.some((e) => e.type === 'impact' && e.highlighted)).toBe(true);
    expect(viz.edges.some((e) => e.type === 'imports')).toBe(true);
  });
});

describe('visualizationFromLaidOutForceGraph', () => {
  it('keeps dagre positions scaled into the shared viz model', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { filePath: 'api/src/a.ts', isHotspot: true, score: 80 },
        { filePath: 'api/src/b.ts', isHotspot: false, score: 10 },
        { filePath: 'web/c.tsx', isHotspot: false, score: 5 }
      ],
      edges: [
        { fromModule: 'api/src/a.ts', toModule: 'api/src/b.ts', confidence: 1 },
        { fromModule: 'api/src/b.ts', toModule: 'web/c.tsx', confidence: 0.6 }
      ]
    };
    const view = buildArchitectureView(graph, { clusterAbove: 60 });
    const laid = layoutWithDagre(view);
    const viz = visualizationFromLaidOutForceGraph(laid, { revisionSha: 'spike', scale: 40 });

    expect(viz.nodes).toHaveLength(3);
    expect(viz.edges).toHaveLength(2);
    expect(viz.edges.some((e) => e.confidence < 0.9)).toBe(true);

    const a = viz.nodes.find((n) => n.path === 'api/src/a.ts');
    const laidA = laid.nodes.find((n) => n.id === 'api/src/a.ts');
    expect(a?.position?.x).toBeCloseTo((laidA?.x ?? 0) / 40, 5);
    expect(a?.position?.y).toBeCloseTo(-((laidA?.y ?? 0) / 40), 5);
    expect((a?.position?.z ?? 0) > 0).toBe(true);
  });
});
