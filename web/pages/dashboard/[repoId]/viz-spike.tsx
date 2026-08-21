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
import { DEMO_ARCHITECTURE, DEMO_HOTSPOTS, demoFileImpact } from '../../../lib/demoData';
import type { FileImpactAnalysis, HotspotRow } from '../../../lib/types';
import { forceGraphFromFileImpact } from '../../../lib/impactBlastGraph';
import {
  parseTopoWindowDays,
  scaleHotspotsForWindow,
  type TopoWindowDays
} from '../../../lib/topography';
import {
  isViz3dSpikeEnabled,
  layoutImpactTheater,
  layoutTopographyTerrain,
  visualizationFromFileImpact,
  visualizationFromHotspots,
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
  const wantTopo = router.query.topo === '1' || router.query.topo === 'true';
  const windowDays: TopoWindowDays = parseTopoWindowDays(
    typeof router.query.window === 'string' ? router.query.window : null
  );
  const theaterMode = Boolean(wantBlast && deepFile && !wantTopo);
  const topoMode = Boolean(wantTopo);
  const reduceMotion = useReducedMotion() === true;
  const spikeEnabled = isViz3dSpikeEnabled();
  const envDemo = isDemoMode();
  const [forceDemoFixtures, setForceDemoFixtures] = useState(false);
  const demo = envDemo || forceDemoFixtures;

  const [repoFullName, setRepoFullName] = useState('');
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [impact, setImpact] = useState<FileImpactAnalysis | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
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
    if (!repoId || !topoMode) {
      setHotspots([]);
      return;
    }
    let cancelled = false;
    async function loadTopo() {
      setLoading(true);
      try {
        if (demo) {
          if (!cancelled) {
            setHotspots(scaleHotspotsForWindow(DEMO_HOTSPOTS, windowDays));
            setError(null);
          }
          return;
        }
        const response = await fetch(
          repoApiPath(repoId!, `hotspots?topK=40&windowDays=${windowDays}`)
        );
        if (!response.ok) throw new Error('Could not load hotspots for 3D topography.');
        const data = (await response.json()) as HotspotRow[];
        if (!cancelled) {
          setHotspots(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setHotspots([]);
          setError(err instanceof Error ? err.message : 'Failed to load topography');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadTopo();
    return () => {
      cancelled = true;
    };
  }, [repoId, topoMode, windowDays, demo]);

  useEffect(() => {
    if (!repoId || !theaterMode || !deepFile) {
      setImpact(null);
      return;
    }
    let cancelled = false;
    async function loadImpact() {
      setLoading(true);
      try {
        if (demo) {
          const demoImpact = demoFileImpact(deepFile!);
          if (!demoImpact) throw new Error('Demo impact not found for this file.');
          if (!cancelled) {
            setImpact(demoImpact);
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
  }, [repoId, theaterMode, deepFile, revisionSha, demo]);

  useEffect(() => {
    if (!repoId || theaterMode || topoMode) return;
    if (demo) {
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
          if (!data.nodes?.length) {
            setError(
              'No module graph for this revision — the index has no importable source files (e.g. docs-only repos). Try demo fixtures or another repo.'
            );
          } else {
            setError(null);
          }
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
  }, [repoId, revisionSha, theaterMode, topoMode, demo]);

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

  const forceData: ForceGraphData | null = useMemo(() => {
    if (topoMode && hotspots.length > 0) {
      return {
        nodes: hotspots.slice(0, 40).map((row) => ({
          id: row.filePath,
          label: row.filePath.split('/').slice(-2).join('/'),
          val: Math.max(1, row.score / 20),
          isHotspot: row.score >= 40,
          score: row.score,
          kind: 'file' as const
        })),
        links: []
      };
    }
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
  }, [architectureView, sizePreset, theaterMode, impact, topoMode, hotspots]);

  const laidOut: ForceGraphData | null = useMemo(() => {
    if (!forceData) return null;
    return layoutWithDagre(forceData);
  }, [forceData]);

  const vizGraph = useMemo(() => {
    if (topoMode && hotspots.length > 0) {
      return layoutTopographyTerrain(visualizationFromHotspots(hotspots, { metric: 'score' }));
    }
    if (theaterMode && impact) {
      return layoutImpactTheater(visualizationFromFileImpact(impact));
    }
    if (!laidOut) return null;
    return visualizationFromLaidOutForceGraph(laidOut, { revisionSha, scale: 40 });
  }, [laidOut, revisionSha, theaterMode, impact, topoMode, hotspots]);

  useEffect(() => {
    if (!deepFile || !vizGraph) return;
    if (deepFileApplied.current === deepFile) return;
    const hit = vizGraph.nodes.find(
      (n) => n.path === deepFile || n.id === deepFile || n.id === `file:${deepFile}`
    );
    if (!hit) return;
    deepFileApplied.current = deepFile;
    setSelectedId(hit.id);
    setFocusId(hit.id);
  }, [deepFile, vizGraph]);

  const band = lodBandForDistance(statsRef.current.cameraDistance || 40);
  void statsTick;

  const selectedNode = vizGraph?.nodes.find((n) => n.id === selectedId) ?? null;

  const title = topoMode
    ? '3D topography'
    : theaterMode
      ? '3D impact theater'
      : '3D architecture';

  const lede = topoMode
    ? 'Hotspot districts in terrain form. Product Topography stays 2D.'
    : theaterMode
      ? 'Blast rings on Z layers. Product Impact stays 2D.'
      : 'Same architecture graph + dagre layout — orbit to change LOD.';

  function selectNode(id: string | null) {
    setSelectedId(id);
    if (id) setFocusId(id);
  }

  if (!spikeEnabled) {
    return (
      <div className="ui-viz-spike">
        <ErrorBanner>3D viz spike is disabled (NEXT_PUBLIC_VIZ_3D_SPIKE=false).</ErrorBanner>
        <p className="ui-viz-spike__lede">
          Open the production{' '}
          <a href={repoId ? `/dashboard/${repoId}/architecture` : '#'}>Architecture</a> view.
        </p>
      </div>
    );
  }

  const backHref =
    topoMode && repoId
      ? `/dashboard/${repoId}/hotspots${windowDays === 30 ? '' : `?window=${windowDays}`}`
      : theaterMode && deepFile && repoId
        ? impactHref(repoId, { file: deepFile, revisionSha })
        : repoId
          ? `/dashboard/${repoId}/architecture`
          : '#';

  return (
    <div className={`ui-viz-spike${mode === '2d' || webglLost ? ' ui-viz-spike--2d' : ''}`}>
      <div className="ui-viz-spike__toolbar">
        <div className="ui-viz-spike__toolbar-title">
          <p className="label-caps">{title}</p>
          <p className="ui-viz-spike__lede">
            {lede}
            {demo ? ' Demo fixtures loaded.' : null}
          </p>
        </div>
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
            2D
          </button>
        </div>
        {!theaterMode && !topoMode ? (
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
        <a className="ui-diagram__action ui-viz-spike__back" href={backHref}>
          {topoMode ? 'Back to Topography' : theaterMode ? 'Back to Impact' : 'Architecture 2D'}
        </a>
      </div>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {indexInProgress ? <IndexHint repoFullName={repoFullName || undefined} /> : null}
      {!demo && graph && graph.nodes.length === 0 && !loading ? (
        <div className="ui-viz-spike__empty-actions">
          <button type="button" className="ui-diagram__action" onClick={() => setForceDemoFixtures(true)}>
            Load demo fixtures
          </button>
          <a className="ui-diagram__action" href={repoId ? `/dashboard/${repoId}/architecture` : '#'}>
            Open Architecture 2D
          </a>
        </div>
      ) : null}

      <div className="ui-viz-spike__stage">
        {mode === '2d' || webglLost ? (
          <div className="ui-viz-spike__2d">
            {webglLost ? (
              <p className="ui-viz-spike__empty" role="alert">
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
            ) : (
              <p className="ui-viz-spike__empty">
                {loading ? 'Loading graph…' : 'No graph to show.'}
              </p>
            )}
          </div>
        ) : vizGraph && vizGraph.nodes.length > 0 ? (
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
        ) : (
          <p className="ui-viz-spike__empty">
            {loading
              ? 'Loading architecture…'
              : graph && graph.nodes.length === 0
                ? 'No modules to render — this revision has an empty architecture graph.'
                : 'No graph yet — index the repo or load demo fixtures.'}
          </p>
        )}
      </div>

      {mode === '3d' && !webglLost ? (
        <div className="ui-viz-spike__dock">
          <div className="ui-viz-spike__panel">
            <h2>Selection</h2>
            <p>
              {selectedNode
                ? `${selectedNode.label}${selectedNode.path ? ` · ${selectedNode.path}` : ''}`
                : 'Click a node to inspect'}
            </p>
            {hoverId ? <p className="ui-viz-spike__hover">Hover: {hoverId}</p> : null}
          </div>
          <div className="ui-viz-spike__panel">
            <h2>Pipeline</h2>
            <p>
              Architecture API → <code>buildArchitectureView</code> → dagre → shared{' '}
              <code>VisualizationGraph</code> → 2D / 3D.
            </p>
          </div>
          <div className="ui-viz-spike__panel">
            <h2>Counts</h2>
            <ul className="ui-viz-spike__counts">
              <li>
                <strong>{graph?.nodes.length ?? 0}</strong>
                <span>Source</span>
              </li>
              <li>
                <strong>{vizGraph?.nodes.length ?? forceData?.nodes.length ?? 0}</strong>
                <span>Visible</span>
              </li>
              <li>
                <strong>{vizGraph?.edges.length ?? forceData?.links.length ?? 0}</strong>
                <span>Edges</span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
