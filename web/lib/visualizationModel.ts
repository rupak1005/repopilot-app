/**
 * Shared visualization projection — adapters from Architecture / Impact / Hotspots
 * into one node/edge contract for 2D and future 3D scenes.
 *
 * Source of truth for evidence remains the Context Graph; this layer is display-only.
 */
import { fileNodeId } from '@repopilot/common';
import type { ArchitectureGraph, ForceGraphData } from './architecture';
import { directoryClusterKey, layerOf } from './architecture';
import type { BlastOverlay } from './blastOverlay';
import type { FileImpactAnalysis, HotspotRow } from './types';
import { hotspotMetricValue, type TopoMetric } from './topography';

function shortLabel(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 3) return filePath;
  return parts.slice(-3).join('/');
}

export type VisualizationEntityType =
  | 'file'
  | 'cluster'
  | 'test'
  | 'symbol'
  | 'external'
  | 'module';

export type VisualizationRelationshipType =
  | 'imports'
  | 'depends_on'
  | 'calls'
  | 'tests'
  | 'impact'
  | 'related_to';

export type VisualizationEvidenceRef = {
  kind: string;
  file?: string;
  line?: number;
  note?: string;
};

export type VisualizationMetrics = {
  /** 0–100 hotspot / risk-ish score when known. */
  hotspotScore?: number;
  churn?: number;
  dependents?: number;
  findings?: number;
  /** Normalized 0–1 impact proximity (1 = seed). */
  impact?: number;
  /** Mapped from LOW/MEDIUM/HIGH when present. */
  risk?: number;
};

export type VisualizationNodeState = {
  selected: boolean;
  highlighted: boolean;
  hidden: boolean;
  expanded: boolean;
};

export type VisualizationNode = {
  id: string;
  entityType: VisualizationEntityType;
  label: string;
  path?: string;
  position?: { x: number; y: number; z: number };
  metrics: VisualizationMetrics;
  state: VisualizationNodeState;
  evidence: VisualizationEvidenceRef[];
  /** Top-level folder / layer chip. */
  layer?: ReturnType<typeof layerOf>;
  blastRole?: 'seed' | 'direct' | 'transitive';
};

export type VisualizationEdge = {
  id: string;
  source: string;
  target: string;
  type: VisualizationRelationshipType;
  strength?: number;
  confidence: number;
  highlighted: boolean;
  evidence: VisualizationEvidenceRef[];
};

export type VisualizationGraph = {
  revisionSha: string | null;
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
};

export type MetricScaleKind = 'linear' | 'sqrt' | 'log';

const DEFAULT_STATE: VisualizationNodeState = {
  selected: false,
  highlighted: false,
  hidden: false,
  expanded: false
};

export function riskLabelToScore(risk: 'LOW' | 'MEDIUM' | 'HIGH' | string | undefined): number {
  if (risk === 'HIGH') return 90;
  if (risk === 'MEDIUM') return 55;
  if (risk === 'LOW') return 20;
  return 0;
}

/** Map a raw metric into [0, 1] with outlier-friendly transforms. */
export function normalizeMetric(
  value: number,
  max: number,
  kind: MetricScaleKind = 'linear'
): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  const v = Math.max(0, value);
  const m = Math.max(v, max);
  if (kind === 'sqrt') return Math.sqrt(v) / Math.sqrt(m);
  if (kind === 'log') return Math.log1p(v) / Math.log1p(m);
  return Math.min(1, v / m);
}

export function mapMetricToHeight(
  value: number,
  max: number,
  opts?: { min?: number; maxHeight?: number; kind?: MetricScaleKind }
): number {
  const min = opts?.min ?? 0.15;
  const maxHeight = opts?.maxHeight ?? 1;
  const t = normalizeMetric(value, max, opts?.kind ?? 'sqrt');
  return min + t * (maxHeight - min);
}

export function mapMetricToSize(
  value: number,
  max: number,
  opts?: { min?: number; maxSize?: number; kind?: MetricScaleKind }
): number {
  const min = opts?.min ?? 0.35;
  const maxSize = opts?.maxSize ?? 1;
  const t = normalizeMetric(value, max, opts?.kind ?? 'sqrt');
  return min + t * (maxSize - min);
}

export function mapMetricToOpacity(
  value: number,
  max: number,
  opts?: { min?: number; kind?: MetricScaleKind }
): number {
  const min = opts?.min ?? 0.25;
  const t = normalizeMetric(value, max, opts?.kind ?? 'linear');
  return min + t * (1 - min);
}

function nodeFromPath(
  path: string,
  partial?: Partial<VisualizationNode> & { metrics?: VisualizationMetrics }
): VisualizationNode {
  return {
    id: fileNodeId(path),
    entityType: 'file',
    label: shortLabel(path),
    path,
    metrics: partial?.metrics ?? {},
    state: { ...DEFAULT_STATE, ...partial?.state },
    evidence: partial?.evidence ?? [],
    layer: layerOf(path),
    blastRole: partial?.blastRole,
    position: partial?.position
  };
}

/** Architecture API → visualization graph (module imports). */
export function visualizationFromArchitecture(
  graph: ArchitectureGraph,
  opts?: { revisionSha?: string | null }
): VisualizationGraph {
  const nodes = graph.nodes.map((n) =>
    nodeFromPath(n.filePath, {
      metrics: {
        hotspotScore: n.score,
        risk: n.isHotspot ? Math.max(n.score, 40) : n.score
      },
      evidence: n.isHotspot ? [{ kind: 'hotspot', file: n.filePath }] : []
    })
  );

  const edges: VisualizationEdge[] = graph.edges.map((e, i) => {
    const confidence = e.confidence ?? 1;
    const type: VisualizationRelationshipType =
      e.kind === 'calls' || e.kind === 'tests' || e.kind === 'imports' || e.kind === 'depends_on'
        ? e.kind
        : 'imports';
    return {
      id: `arch:${e.fromModule}->${e.toModule}:${i}`,
      source: fileNodeId(e.fromModule),
      target: fileNodeId(e.toModule),
      type,
      confidence,
      highlighted: false,
      evidence:
        confidence < 0.9
          ? [{ kind: 'uncertain', note: `confidence ${confidence.toFixed(2)}` }]
          : []
    };
  });

  return {
    revisionSha: opts?.revisionSha ?? null,
    nodes,
    edges
  };
}

/** Hotspot rows → topography nodes (no edges). */
export function visualizationFromHotspots(
  rows: HotspotRow[],
  opts?: { revisionSha?: string | null; metric?: TopoMetric }
): VisualizationGraph {
  const metric = opts?.metric ?? 'score';
  const max = rows.reduce((m, r) => Math.max(m, hotspotMetricValue(r, metric)), 0);

  const nodes = rows.map((row, index) => {
    const value = hotspotMetricValue(row, metric);
    return nodeFromPath(row.filePath, {
      metrics: {
        hotspotScore: row.score,
        churn: row.changeCount,
        dependents: row.dependentCount,
        findings: row.findingsCount,
        risk: row.score
      },
      evidence: row.reasons.map((note) => ({ kind: 'hotspot-reason', file: row.filePath, note })),
      position: {
        x: (index % 8) - 3.5,
        y: Math.floor(index / 8),
        z: mapMetricToHeight(value, max, { kind: 'sqrt', maxHeight: 4 })
      },
      state: { ...DEFAULT_STATE }
    });
  });

  // Cluster landmark stubs (zero-size helpers for future Troika titles).
  const clusters = new Set(rows.map((r) => directoryClusterKey(r.filePath)));
  for (const key of clusters) {
    if (key === '__root__') continue;
    nodes.push({
      id: `cluster:${key}`,
      entityType: 'cluster',
      label: key.toUpperCase(),
      path: `${key}/`,
      metrics: {},
      state: { ...DEFAULT_STATE },
      evidence: [],
      layer: layerOf(`${key}/x`)
    });
  }

  return {
    revisionSha: opts?.revisionSha ?? null,
    nodes,
    edges: []
  };
}

/**
 * Place hotspot files in district clusters for 3D topography.
 * Preserves metric Z height; assigns radial XY around each directory landmark.
 */
export function layoutTopographyTerrain(graph: VisualizationGraph): VisualizationGraph {
  const files = graph.nodes
    .filter((n) => n.entityType !== 'cluster')
    .map((n) => ({
      ...n,
      position: { x: 0, y: 0, z: n.position?.z ?? 0 },
      state: { ...n.state }
    }));
  const clusters = graph.nodes
    .filter((n) => n.entityType === 'cluster')
    .map((n) => ({
      ...n,
      position: { x: 0, y: 0, z: 0.15 },
      state: { ...n.state }
    }));

  const groups = new Map<string, typeof files>();
  for (const file of files) {
    const key = directoryClusterKey(file.path ?? file.label);
    const list = groups.get(key) ?? [];
    list.push(file);
    groups.set(key, list);
  }

  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const cols = Math.max(1, Math.ceil(Math.sqrt(keys.length)));

  keys.forEach((key, index) => {
    const cx = (index % cols) * 7 - ((cols - 1) * 3.5);
    const cy = Math.floor(index / cols) * 7;
    const cluster = clusters.find((c) => c.id === `cluster:${key}`);
    if (cluster) {
      cluster.position = { x: cx, y: cy, z: 0.2 };
    }
    const members = groups.get(key) ?? [];
    members.forEach((member, i) => {
      const count = members.length;
      const angle = count <= 1 ? 0 : (i / count) * Math.PI * 2 - Math.PI / 2;
      const radius = count <= 1 ? 0 : 1.1 + Math.min(i, 8) * 0.12;
      member.position = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        z: Math.max(member.position?.z ?? 0.5, 0.35)
      };
    });
  });

  return { ...graph, nodes: [...files, ...clusters] };
}

/**
 * File impact → blast-layer graph.
 * Z encodes impact distance: seed=0, direct=1, transitive=2, tests=3.
 */
export function visualizationFromFileImpact(
  impact: FileImpactAnalysis,
  opts?: { blast?: BlastOverlay }
): VisualizationGraph {
  const blast = opts?.blast ?? {
    seed: impact.target.filePath,
    direct: impact.directDependents,
    transitive: impact.transitiveDependents
  };

  const risk = riskLabelToScore(impact.risk);
  const byId = new Map<string, VisualizationNode>();

  function upsert(
    path: string,
    role: 'seed' | 'direct' | 'transitive' | undefined,
    z: number,
    extra?: Partial<VisualizationMetrics>
  ) {
    const id = fileNodeId(path);
    const existing = byId.get(id);
    const impactProximity = role === 'seed' ? 1 : role === 'direct' ? 0.7 : role === 'transitive' ? 0.4 : 0.2;
    if (existing) {
      existing.blastRole = existing.blastRole ?? role;
      existing.metrics = { ...existing.metrics, ...extra, impact: Math.max(existing.metrics.impact ?? 0, impactProximity) };
      if (existing.position) existing.position.z = Math.min(existing.position.z, z);
      return;
    }
    byId.set(
      id,
      nodeFromPath(path, {
        blastRole: role,
        metrics: {
          risk: role === 'seed' ? risk : risk * impactProximity,
          impact: impactProximity,
          hotspotScore: impact.hotspot?.score,
          churn: impact.hotspot?.changeCount,
          ...extra
        },
        position: { x: 0, y: 0, z },
        evidence: [{ kind: 'impact', file: path, note: impact.summary.slice(0, 160) }],
        state: {
          ...DEFAULT_STATE,
          selected: role === 'seed',
          highlighted: role === 'seed' || role === 'direct'
        }
      })
    );
  }

  upsert(blast.seed, 'seed', 0);
  blast.direct.forEach((p, i) => upsert(p, 'direct', 1, { dependents: blast.direct.length - i }));
  blast.transitive.forEach((p) => upsert(p, 'transitive', 2));

  for (const test of impact.relevantTests) {
    const id = fileNodeId(test.filePath);
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        entityType: 'test',
        label: shortLabel(test.filePath),
        path: test.filePath,
        metrics: { impact: 0.35 },
        state: { ...DEFAULT_STATE },
        evidence: [{ kind: 'test', file: test.filePath, note: test.reason }],
        layer: layerOf(test.filePath),
        position: { x: 0, y: 0, z: 3 }
      });
    }
  }

  const edges: VisualizationEdge[] = [];
  const seedId = fileNodeId(blast.seed);

  for (const dep of blast.direct) {
    edges.push({
      id: `impact:direct:${seedId}->${fileNodeId(dep)}`,
      source: seedId,
      target: fileNodeId(dep),
      type: 'impact',
      confidence: impact.confidence === 'HIGH' ? 0.95 : impact.confidence === 'MEDIUM' ? 0.75 : 0.5,
      highlighted: true,
      evidence: [{ kind: 'direct-dependent', file: dep }]
    });
  }

  for (const dep of blast.transitive) {
    edges.push({
      id: `impact:trans:${seedId}->${fileNodeId(dep)}`,
      source: seedId,
      target: fileNodeId(dep),
      type: 'impact',
      strength: 0.4,
      confidence: 0.55,
      highlighted: false,
      evidence: [{ kind: 'transitive-dependent', file: dep }]
    });
  }

  for (const imp of impact.outboundImports) {
    edges.push({
      id: `impact:import:${seedId}->${fileNodeId(imp)}`,
      source: seedId,
      target: fileNodeId(imp),
      type: 'imports',
      confidence: 0.9,
      highlighted: false,
      evidence: []
    });
    upsert(imp, undefined, 0.5);
  }

  return {
    revisionSha: impact.revisionSha,
    nodes: [...byId.values()],
    edges
  };
}

/**
 * Radial XY layout for Impact theater: rings by blast layer, amplified Z for R3F.
 * Does not invent edges — only places nodes already in the impact viz graph.
 */
export function layoutImpactTheater(graph: VisualizationGraph): VisualizationGraph {
  const nodes = graph.nodes.map((n) => ({
    ...n,
    position: { x: 0, y: 0, z: n.position?.z ?? 0 },
    state: { ...n.state }
  }));

  const seed = nodes.filter((n) => n.blastRole === 'seed');
  const direct = nodes.filter((n) => n.blastRole === 'direct');
  const transitive = nodes.filter((n) => n.blastRole === 'transitive');
  const tests = nodes.filter((n) => n.entityType === 'test');
  const imports = nodes.filter(
    (n) => n.blastRole == null && n.entityType !== 'test' && Math.abs((n.position?.z ?? 0) - 0.5) < 0.01
  );
  const placed = new Set(
    [...seed, ...direct, ...transitive, ...tests, ...imports].map((n) => n.id)
  );
  const other = nodes.filter((n) => !placed.has(n.id));

  function ring(list: VisualizationNode[], radius: number, z: number) {
    const count = list.length;
    if (count === 0) return;
    list.forEach((node, i) => {
      if (radius <= 0) {
        node.position = { x: 0, y: 0, z };
        return;
      }
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      node.position = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z
      };
    });
  }

  ring(seed, 0, 0);
  ring(imports, 1.6, 1.2);
  ring(direct, 2.6, 2.4);
  ring(other, 3.4, 3.2);
  ring(transitive, 4.4, 4.6);
  ring(tests, 5.6, 6.8);

  return { ...graph, nodes };
}

/** Bridge back to the existing force-graph canvas without rewriting ArchitectureGraph yet. */
export function visualizationToForceGraphIds(graph: VisualizationGraph): {
  nodeIds: string[];
  linkPairs: Array<{ source: string; target: string; uncertain?: boolean }>;
} {
  return {
    nodeIds: graph.nodes.map((n) => n.path ?? n.id),
    linkPairs: graph.edges.map((e) => ({
      source: e.source.startsWith('file:') ? e.source.slice(5) : e.source,
      target: e.target.startsWith('file:') ? e.target.slice(5) : e.target,
      uncertain: e.confidence < 0.9
    }))
  };
}

/**
 * Adapter boundary: laid-out ForceGraphData (dagre/ELK x,y) → VisualizationGraph for 2D or 3D.
 * Does not recompute analysis — only projects layout + metrics into the shared model.
 */
export function visualizationFromLaidOutForceGraph(
  data: ForceGraphData,
  opts?: {
    revisionSha?: string | null;
    /** Divide pixel layout coords for Three.js world units. */
    scale?: number;
    /** Lift hotspots on Z. */
    zFromScore?: boolean;
  }
): VisualizationGraph {
  const scale = opts?.scale ?? 40;
  const zFromScore = opts?.zFromScore !== false;
  const maxScore = data.nodes.reduce((m, n) => Math.max(m, n.score ?? 0), 0);

  const nodes: VisualizationNode[] = data.nodes.map((n) => {
    const isCluster = n.kind === 'cluster' || n.id.startsWith('cluster:');
    const path = isCluster ? undefined : n.id;
    const id = isCluster ? n.id : fileNodeId(n.id);
    const z = zFromScore
      ? mapMetricToHeight(n.score ?? 0, maxScore || 1, { min: 0, maxHeight: 2.5, kind: 'sqrt' })
      : 0;
    return {
      id,
      entityType: isCluster ? 'cluster' : 'file',
      label: n.label,
      path,
      position: {
        x: (n.x ?? 0) / scale,
        y: -((n.y ?? 0) / scale),
        z
      },
      metrics: {
        hotspotScore: n.score,
        risk: n.isHotspot ? Math.max(n.score, 40) : n.score
      },
      state: { ...DEFAULT_STATE },
      evidence: n.isHotspot ? [{ kind: 'hotspot', file: path, note: `score ${n.score}` }] : [],
      layer: layerOf(n.id)
    };
  });

  const idByPath = new Map<string, string>();
  for (const n of nodes) {
    if (n.path) idByPath.set(n.path, n.id);
    idByPath.set(n.id, n.id);
    // Also map raw force-graph id for clusters
    if (n.entityType === 'cluster') idByPath.set(n.id, n.id);
  }

  function resolveEndpoint(raw: string): string | null {
    if (idByPath.has(raw)) return idByPath.get(raw)!;
    if (raw.startsWith('cluster:')) return raw;
    const urn = fileNodeId(raw);
    return idByPath.get(urn) ?? idByPath.get(raw) ?? null;
  }

  const edges: VisualizationEdge[] = [];
  data.links.forEach((link, i) => {
    const srcRaw = String(link.source);
    const tgtRaw = String(link.target);
    const source = resolveEndpoint(srcRaw);
    const target = resolveEndpoint(tgtRaw);
    if (!source || !target || source === target) return;
    edges.push({
      id: `layout:${source}->${target}:${i}`,
      source,
      target,
      type: 'imports',
      confidence: link.uncertain ? 0.7 : 1,
      highlighted: false,
      evidence: link.uncertain ? [{ kind: 'uncertain' }] : []
    });
  });

  return {
    revisionSha: opts?.revisionSha ?? null,
    nodes,
    edges
  };
}

export function isViz3dSpikeEnabled(): boolean {
  // Dedicated route is the isolation boundary; env can disable the page body.
  if (typeof process === 'undefined') return true;
  const raw = process.env.NEXT_PUBLIC_VIZ_3D_SPIKE;
  if (raw === 'false' || raw === '0') return false;
  return true;
}
