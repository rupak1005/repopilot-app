import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ArchitectureGraphView } from '../../../components/ui/ArchitectureGraph';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import type { VizPerfStats } from '../../../components/viz/RepoPilotCanvas';
import {
  SPIKE_SIZE_LIMITS,
  ensureSpikeNodeCount,
  lodBandForDistance,
  sliceForceGraphForSpike,
  type SpikeSizePreset
} from '../../../lib/visualizationLod';
import {
  buildArchitectureView,
  clusterIdForPrefix,
  directoryClusterKey,
  type ArchitectureGraph,
  type ForceGraphData
} from '../../../lib/architecture';
import { layoutWithDagre } from '../../../lib/dagreLayout';
import { isDemoMode } from '../../../lib/demoMode';
import { usePendingIndexJobRepoId, useRepoIndexStatus } from '../../../lib/dashboard';
import { isRepoIndexInProgress } from '../../../lib/indexStatus';
import {
  REVISION_QUERY_KEY,
  parseRevisionQuery,
  withRevisionSha,
  impactHref
} from '../../../lib/revisionScope';
import { repoApiPath } from '../../../lib/serverApi';
import { DEMO_ARCHITECTURE, demoFileImpact } from '../../../lib/demoData';
import type { FileImpactAnalysis } from '../../../lib/types';
import { forceGraphFromFileImpact } from '../../../lib/impactBlastGraph';
import {
  isViz3dSpikeEnabled,
  layoutImpactTheater,
  visualizationFromFileImpact,
  visualizationFromLaidOutForceGraph
} from '../../../lib/visualizationModel';

const RepoPilotCanvas = dynamic(
  () => import('../../../components/viz/RepoPilotCanvas').then((m) => m.RepoPilotCanvas),
  { ssr: false }
);

const VizStatsPanel = dynamic(
  () => import('../../../components/viz/RepoPilotCanvas').then((m) => m.VizStatsPanel),
  { ssr: false }
);

const EMPTY_STATS: VizPerfStats = {
  fps: 0,
  frameMs: 0,
  nodes: 0,
  edges: 0,
  visibleLabels: 0,
  drawCalls: 0,
  triangles: 0,
  cameraDistance: 40
};

type RenderMode = '3d' | '2d';

export default function VizSpikePage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const revisionSha = parseRevisionQuery(router.query[REVISION_QUERY_KEY]);
  const deepFile =
    typeof router.query.file === 'string' && router.query.file.trim()
      ? router.query.file.trim()
      : null;
  const wantBlast = router.query.blast === '1' || router.query.blast === 'true';
  const theaterMode = Boolean(wantBlast && deepFile);
  const reduceMotion = useReducedMotion() === true;
  const spikeEnabled = isViz3dSpikeEnabled();

  const [repoFullName, setRepoFullName] = useState('');
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [impact, setImpact] = useState<FileImpactAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<RenderMode>('3d');
  const [sizePreset, setSizePreset] = useState<SpikeSizePreset>('live');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const statsRef = useRef<VizPerfStats>({ ...EMPTY_STATS });
  const deepFileApplied = useRef<string | null>(null);

  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const indexInProgress = isRepoIndexInProgress(repoId, indexStatus, pendingIndexJobRepoId);

  useEffect(() => {
    async function loadUser() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = (await response.json()) as { selectedRepoFullName?: string };
        setRepoFullName(user.selectedRepoFullName ?? repoId ?? '');
      }
    }
    void loadUser();
  }, [repoId]);

  useEffect(() => {
    if (!repoId || !theaterMode || !deepFile) {
      setImpact(null);
      return;
    }
    let cancelled = false;
    async function loadImpact() {
      setLoading(true);
      try {
        if (isDemoMode()) {
          const demo = demoFileImpact(deepFile!);
          if (!demo) throw new Error('Demo impact not found for this file.');
          if (!cancelled) {
            setImpact(demo);
            setError(null);
          }
          return;
        }
        const response = await fetch(
          repoApiPath(
            repoId!,
            withRevisionSha(`impact?filePath=${encodeURIComponent(deepFile!)}&depth=2`, revisionSha)
          )
        );
        if (!response.ok) throw new Error('Could not load impact for 3D theater.');
        const data = (await response.json()) as FileImpactAnalysis;
        if (!cancelled) {
          setImpact(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setImpact(null);
          setError(err instanceof Error ? err.message : 'Failed to load impact theater');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadImpact();
    return () => {
      cancelled = true;
    };
  }, [repoId, theaterMode, deepFile, revisionSha]);

  useEffect(() => {
    if (!repoId || theaterMode) return;
    if (isDemoMode()) {
      setGraph(DEMO_ARCHITECTURE);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(
          repoApiPath(repoId!, withRevisionSha('architecture', revisionSha))
        );
        if (!response.ok) throw new Error('Could not load architecture — index the repo first.');
        const data = (await response.json()) as ArchitectureGraph;
        if (!cancelled) {
          setGraph(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load architecture');
          setGraph(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId, revisionSha, theaterMode]);

  useEffect(() => {
    const id = window.setInterval(() => setStatsTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const architectureView = useMemo(() => {
    if (!graph) return null;
    const expandAll =
      sizePreset === 'large'
        ? [
            ...new Set(
              graph.nodes.map((n) => clusterIdForPrefix(directoryClusterKey(n.filePath)))
            )
          ]
        : [];
    return buildArchitectureView(graph, {
      expandedClusters: expandAll,
      maxFilesPerCluster: sizePreset === 'large' ? 120 : 40,
      clusterAbove: sizePreset === 'small' ? 9999 : 60
    });
  }, [graph, sizePreset]);

  /** Pre-layout force graph shared by 2D fallback and 3D layout adapter. */
  const forceData: ForceGraphData | null = useMemo(() => {
    if (theaterMode && impact) {
      return forceGraphFromFileImpact(impact).data;
    }
    if (!architectureView) return null;
    const base = { nodes: architectureView.nodes, links: architectureView.links };
    if (sizePreset === 'live') return base;
    if (sizePreset === 'large') {
      return ensureSpikeNodeCount(base, SPIKE_SIZE_LIMITS.large);
    }
    return sliceForceGraphForSpike(base, SPIKE_SIZE_LIMITS[sizePreset]);
  }, [architectureView, sizePreset, theaterMode, impact]);

  const laidOut: ForceGraphData | null = useMemo(() => {
    if (!forceData) return null;
    return layoutWithDagre(forceData);
  }, [forceData]);

  const vizGraph = useMemo(() => {
    if (theaterMode && impact) {
      return layoutImpactTheater(visualizationFromFileImpact(impact));
    }
    if (!laidOut) return null;
    return visualizationFromLaidOutForceGraph(laidOut, { revisionSha, scale: 40 });
  }, [laidOut, revisionSha, theaterMode, impact]);

  useEffect(() => {
    if (!deepFile || !vizGraph) return;
    if (deepFileApplied.current === deepFile) return;
    const hit = vizGraph.nodes.find((n) => n.path === deepFile || n.id === deepFile || n.id === `file:${deepFile}`);
    if (!hit) return;
    deepFileApplied.current = deepFile;
    setSelectedId(hit.id);
    setFocusId(hit.id);
  }, [deepFile, vizGraph]);

  const band = lodBandForDistance(statsRef.current.cameraDistance || 40);
  void statsTick;

  const selectedNode = vizGraph?.nodes.find((n) => n.id === selectedId) ?? null;

  function selectNode(id: string | null) {
    setSelectedId(id);
    if (id) setFocusId(id);
  }

  if (!spikeEnabled) {
    return (
      <div className="ui-viz-spike">
        <ErrorBanner>3D viz spike is disabled (NEXT_PUBLIC_VIZ_3D_SPIKE=false).</ErrorBanner>
        <p className="ui-viz-spike__hint">
          Open the production{' '}
          <a href={repoId ? `/dashboard/${repoId}/architecture` : '#'}>Architecture</a> view.
        </p>
      </div>
    );
  }

  return (
    <div className="ui-viz-spike">
      <div className="ui-viz-spike__toolbar">
        <p className="label-caps">{theaterMode ? '3D impact theater' : '3D architecture spike'}</p>
        <div className="ui-viz-spike__seg" role="group" aria-label="Renderer">
          <button type="button" aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>
            3D
          </button>
          <button
            type="button"
            aria-pressed={mode === '2d'}
            onClick={() => {
              setMode('2d');
              setWebglLost(false);
            }}
          >
            2D fallback
          </button>
        </div>
        {!theaterMode ? (
          <div className="ui-viz-spike__seg" role="group" aria-label="Fixture size">
            {(['live', 'small', 'medium', 'large'] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={sizePreset === key}
                onClick={() => setSizePreset(key)}
              >
                {key}
              </button>
            ))}
          </div>
        ) : null}
        <a
          className="ui-diagram__action"
          href={
            theaterMode && deepFile && repoId
              ? impactHref(repoId, { file: deepFile, revisionSha })
              : repoId
                ? `/dashboard/${repoId}/architecture`
                : '#'
          }
        >
          {theaterMode ? 'Back to Impact' : 'Production Architecture'}
        </a>
      </div>

      <p className="ui-viz-spike__hint">
        {theaterMode
          ? 'Impact theater: seed / direct / transitive / tests on Z layers (radial XY). Opt-in only — product Impact stays 2D.'
          : 'Isolated R3F prototype. Same architecture API + dagre layout positions → '}
        {!theaterMode ? (
          <>
            <code>visualizationFromLaidOutForceGraph</code>. Does not replace the 2D product graph.
            Orbit to change LOD (far / medium / near). Click a node to focus.
          </>
        ) : null}
        {repoId && !theaterMode ? (
          <>
            {' '}
            <a href={`/dashboard/${repoId}/architecture`}>Back to Architecture 2D</a>
          </>
        ) : null}
      </p>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {indexInProgress ? <IndexHint repoFullName={repoFullName || undefined} /> : null}
      {loading && !graph ? <p className="ui-viz-spike__hint">Loading architecture…</p> : null}

      <div className="ui-viz-spike__stage">
        {mode === '2d' || webglLost ? (
          <div className="ui-viz-spike__2d">
            {webglLost ? (
              <p className="ui-viz-spike__hint" role="alert">
                WebGL context lost — showing 2D fallback.
              </p>
            ) : null}
            {forceData && forceData.nodes.length > 0 ? (
              <ArchitectureGraphView
                data={forceData}
                viewMeta={architectureView?.meta}
                repoFullName={repoFullName || undefined}
                repoId={repoId ?? undefined}
                revisionSha={revisionSha}
                loading={loading}
              />
            ) : null}
          </div>
        ) : vizGraph ? (
          <>
            <RepoPilotCanvas
              graph={vizGraph}
              selectedId={selectedId}
              focusId={focusId}
              onSelect={selectNode}
              onHover={setHoverId}
              reduceMotion={reduceMotion}
              statsRef={statsRef}
              onContextLost={() => {
                setWebglLost(true);
                setMode('2d');
              }}
            />
            <VizStatsPanel stats={statsRef.current} band={band} />
          </>
        ) : null}
      </div>

      <div className="ui-viz-spike__side">
        <div className="ui-viz-spike__panel">
          <h2>Selection</h2>
          <p>
            {selectedNode
              ? `${selectedNode.label}${selectedNode.path ? ` · ${selectedNode.path}` : ''}`
              : 'None — click a node'}
          </p>
          {hoverId ? <p>Hover: {hoverId}</p> : null}
        </div>
        <div className="ui-viz-spike__panel">
          <h2>Adapter boundary</h2>
          <ul>
            <li>Analysis: GET architecture (unchanged)</li>
            <li>View: buildArchitectureView → layoutWithDagre</li>
            <li>Shared model: visualizationFromLaidOutForceGraph</li>
            <li>Renderers: 2D ArchitectureGraphView · 3D RepoPilotCanvas</li>
          </ul>
        </div>
        <div className="ui-viz-spike__panel">
          <h2>Counts</h2>
          <p>
            Source files: {graph?.nodes.length ?? 0} · Visible nodes:{' '}
            {vizGraph?.nodes.length ?? forceData?.nodes.length ?? 0} · Edges:{' '}
            {vizGraph?.edges.length ?? forceData?.links.length ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
