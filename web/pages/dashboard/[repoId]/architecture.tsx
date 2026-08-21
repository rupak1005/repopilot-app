import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { GitBranch } from '@phosphor-icons/react';
import { ArchitectureGraphView } from '../../../components/ui/ArchitectureGraph';
import { DifferentiatorsStrip } from '../../../components/ui/DifferentiatorsStrip';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import { usePendingIndexJobRepoId, useRepoIndexStatus } from '../../../lib/dashboard';
import { isRepoIndexInProgress } from '../../../lib/indexStatus';
import {
  buildArchitectureView,
  clusterIdForPrefix,
  directoryClusterKey,
  filterArchitectureGraph,
  mergeForceGraphData,
  type ArchitectureGraph,
  type DiagramLayer,
  type ForceGraphData
} from '../../../lib/architecture';
import { blastFromImpactPayload, type BlastOverlay } from '../../../lib/blastOverlay';
import { DEMO_ARCHITECTURE, DEMO_REVISIONS, demoFileImpact } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';
import { type RevisionRow } from '../../../lib/history';
import {
  REVISION_QUERY_KEY,
  architectureHref,
  architectureRouteQuery,
  matchRevisionValue,
  parseArchitectureLayoutQuery,
  parseRevisionQuery,
  revisionSelectLabel,
  viz3dHref,
  withRevisionSha
} from '../../../lib/revisionScope';
import { isViz3dSpikeEnabled } from '../../../lib/visualizationModel';
import { repoApiPath } from '../../../lib/serverApi';
import type { GraphLayoutAlgo } from '../../../lib/elkLayout';

const DEMO_EXPLANATION =
  'RepoPilot maps your codebase into a system diagram: the API layer handles sync, search, and reviews; the web dashboard consumes those endpoints; shared IDs live in common. Orange borders mark churn hotspots from git history.';

export default function ArchitecturePage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [repoFullName, setRepoFullName] = useState('');
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [layer, setLayer] = useState<DiagramLayer>('all');
  const [neighborhoodOverlay, setNeighborhoodOverlay] = useState<ForceGraphData | null>(null);
  const [blastOverlay, setBlastOverlay] = useState<BlastOverlay | null>(null);
  const [moduleCycles, setModuleCycles] = useState<string[][]>([]);
  const prevIndexState = useRef<string | undefined>(undefined);
  const deepFile = typeof router.query.file === 'string' ? router.query.file : null;
  const wantBlast = router.query.blast === '1' || router.query.blast === 'true';
  const revisionSha = parseRevisionQuery(router.query[REVISION_QUERY_KEY]);
  const layoutQuery = parseArchitectureLayoutQuery(router.query.layout);
  const initialLayoutAlgo: GraphLayoutAlgo = layoutQuery === 'system' ? 'elk' : 'dagre';
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);

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
    if (!repoId) return;
    if (isDemoMode()) {
      setRevisions(DEMO_REVISIONS);
      return;
    }
    let cancelled = false;
    async function loadRevisions() {
      try {
        const response = await fetch(repoApiPath(repoId!, 'revisions'));
        if (!response.ok) return;
        const data = (await response.json()) as Array<{ revisionSha: string; indexedAt: string }>;
        if (!cancelled) {
          setRevisions(
            data.map((row) => ({
              revisionSha: row.revisionSha,
              indexedAt: typeof row.indexedAt === 'string' ? row.indexedAt : String(row.indexedAt)
            }))
          );
        }
      } catch {
        if (!cancelled) setRevisions([]);
      }
    }
    void loadRevisions();
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  useEffect(() => {
    if (!repoId) return;
    const activeRepoId = repoId;

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
          repoApiPath(activeRepoId, withRevisionSha('architecture', revisionSha))
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
  }, [repoId, reloadToken, revisionSha]);

  const architectureView = useMemo(() => {
    if (!graph) return null;
    // Filter before cluster: post-cluster layer chips leave a lone cluster node with 0 deps.
    const scoped = filterArchitectureGraph(graph, layer);
    const layerCluster =
      layer === 'api' || layer === 'web' || layer === 'common' ? clusterIdForPrefix(layer) : null;
    const expanded =
      layerCluster && !expandedClusters.includes(layerCluster)
        ? [...expandedClusters, layerCluster]
        : expandedClusters;
    return buildArchitectureView(scoped, {
      expandedClusters: expanded,
      // Layer-scoped graphs are one top-level folder — keep more files visible.
      maxFilesPerCluster: layer === 'all' ? 40 : 80
    });
  }, [graph, expandedClusters, layer]);
  const forceData = useMemo(() => {
    if (!architectureView) return null;
    if (!neighborhoodOverlay) return architectureView;
    return mergeForceGraphData(architectureView, neighborhoodOverlay);
  }, [architectureView, neighborhoodOverlay]);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const indexInProgress = isRepoIndexInProgress(repoId, indexStatus, pendingIndexJobRepoId);
  const empty = graph && graph.nodes.length === 0;
  const slug = repoFullName || repoId || '…';

  useEffect(() => {
    setExpandedClusters([]);
    setNeighborhoodOverlay(null);
    setBlastOverlay(null);
    setModuleCycles([]);
    setLayer('all');
  }, [graph]);

  useEffect(() => {
    setExpandedClusters([]);
    setNeighborhoodOverlay(null);
  }, [layer]);

  useEffect(() => {
    if (!repoId || !graph) return;
    if (isDemoMode()) {
      setModuleCycles([
        ['api/src/services/codebaseQa.ts', 'api/src/services/searchIndex.ts']
      ]);
      return;
    }
    let cancelled = false;
    async function loadCycles() {
      try {
        const response = await fetch(
          repoApiPath(repoId!, withRevisionSha('graph?op=cycles&limit=25', revisionSha))
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { cycles?: string[][] };
        if (!cancelled) setModuleCycles(payload.cycles ?? []);
      } catch {
        if (!cancelled) setModuleCycles([]);
      }
    }
    void loadCycles();
    return () => {
      cancelled = true;
    };
  }, [repoId, graph, revisionSha]);

  useEffect(() => {
    if (!wantBlast || !deepFile || !repoId) {
      setBlastOverlay(null);
      return;
    }
    if (isDemoMode()) {
      const demo = demoFileImpact(deepFile);
      setBlastOverlay(demo ? blastFromImpactPayload(demo) : { seed: deepFile, direct: [], transitive: [] });
      return;
    }
    let cancelled = false;
    async function loadBlast() {
      try {
        const response = await fetch(
          repoApiPath(
            repoId!,
            withRevisionSha(
              `impact?filePath=${encodeURIComponent(deepFile!)}&depth=2`,
              revisionSha
            )
          )
        );
        if (!response.ok) throw new Error('impact unavailable');
        const payload = (await response.json()) as {
          target: { filePath: string };
          directDependents: string[];
          transitiveDependents: string[];
        };
        if (!cancelled) setBlastOverlay(blastFromImpactPayload(payload));
      } catch {
        if (!cancelled) setBlastOverlay({ seed: deepFile!, direct: [], transitive: [] });
      }
    }
    void loadBlast();
    return () => {
      cancelled = true;
    };
  }, [wantBlast, deepFile, repoId, revisionSha]);

  useEffect(() => {
    if (!graph || graph.nodes.length <= 60) return;
    const paths = blastOverlay
      ? [blastOverlay.seed, ...blastOverlay.direct, ...blastOverlay.transitive]
      : deepFile
        ? [deepFile]
        : [];
    if (paths.length === 0) return;
    setExpandedClusters((prev) => {
      let changed = false;
      const next = [...prev];
      for (const path of paths) {
        const cid = clusterIdForPrefix(directoryClusterKey(path));
        if (!next.includes(cid)) {
          next.push(cid);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [deepFile, blastOverlay, graph]);

  useEffect(() => {
    const prev = prevIndexState.current;
    prevIndexState.current = indexStatus?.state;
    if (prev === 'indexing' && indexStatus?.state === 'ready') {
      setReloadToken((n) => n + 1);
    }
  }, [indexStatus?.state]);

  function onRevisionChange(next: string) {
    if (!repoId) return;
    void router.replace(
      {
        pathname: `/dashboard/${repoId}/architecture`,
        query: architectureRouteQuery({
          file: deepFile,
          blast: wantBlast,
          layout: layoutQuery,
          revisionSha: next || null
        })
      },
      undefined,
      { shallow: true }
    );
  }

  function syncArchitectureQuery(patch: {
    file?: string | null;
    layout?: 'flow' | 'system';
  }) {
    if (!repoId) return;
    void router.replace(
      {
        pathname: `/dashboard/${repoId}/architecture`,
        query: architectureRouteQuery({
          file: patch.file !== undefined ? patch.file : deepFile,
          blast: wantBlast,
          layout: patch.layout ?? layoutQuery,
          revisionSha
        })
      },
      undefined,
      { shallow: true }
    );
  }

  const shareUrl = repoId
    ? architectureHref(repoId, {
        file: deepFile ?? undefined,
        blast: wantBlast,
        layout: layoutQuery,
        revisionSha
      })
    : null;

  const selectedRevisionValue = matchRevisionValue(revisions, revisionSha);

  return (
    <div className="ui-diagram-page">
        <header className="ui-diagram-hero">
          <div>
            <p className="ui-diagram-hero__eyebrow label-caps">Repository → diagram</p>
            <h1>See how your codebase fits together</h1>
            <p className="ui-diagram-hero__sub">
              Interactive module map from real dependency edges — not AI-generated Mermaid. Click
              through to GitHub, search, or impact analysis.
            </p>
            {repoId && isViz3dSpikeEnabled() ? (
              <p className="ui-diagram-hero__3d">
                <Link
                  className="ui-diagram__action"
                  href={viz3dHref(repoId, {
                    file: deepFile ?? undefined,
                    blast: wantBlast,
                    layout: layoutQuery,
                    revisionSha
                  })}
                >
                  Explore 3D →
                </Link>
                <span className="ui-diagram-hero__3d-note"> Opt-in spatial view · 2D stays default</span>
              </p>
            ) : null}
          </div>
          <div className="ui-diagram-repo-bar" aria-label="Current repository">
            <GitBranch size={16} weight="bold" aria-hidden />
            <span className="mono">{slug}</span>
            {revisions.length > 0 ? (
              <label className="ui-diagram-rev">
                <span className="label-caps">Revision</span>
                <select
                  className="ui-diagram-rev__select"
                  value={selectedRevisionValue ?? ''}
                  onChange={(event) => onRevisionChange(event.target.value)}
                  aria-label="Indexed revision for this graph"
                >
                  <option value="">Latest indexed</option>
                  {revisions.map((row, index) => (
                    <option key={row.revisionSha} value={row.revisionSha}>
                      {revisionSelectLabel(row, index)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </header>

        {repoId ? (
          <DifferentiatorsStrip
            title="Explore this repo"
            repoBase={`/dashboard/${repoId}`}
            className="diff-strip--dashboard"
          />
        ) : null}

        {(isDemoMode() || forceData) && !empty ? (
          <p className="ui-diagram-explainer">{DEMO_EXPLANATION}</p>
        ) : null}

        {error && !indexInProgress ? <ErrorBanner>{error}</ErrorBanner> : null}
        {empty && !indexInProgress ? (
          <IndexHint repoFullName={repoFullName || undefined} />
        ) : null}

        {indexInProgress && !forceData ? (
          <div className="ui-diagram__stage ui-diagram__stage--solo">
            <div className="ui-diagram__loading">
              <p>Indexing repository… the dependency diagram will appear when the graph is ready.</p>
            </div>
          </div>
        ) : null}

        {forceData && forceData.nodes.length > 0 ? (
          <ArchitectureGraphView
            data={forceData}
            viewMeta={architectureView?.meta}
            repoFullName={repoFullName || undefined}
            repoId={repoId ?? undefined}
            revisionSha={revisionSha}
            loading={loading}
            initialSelectedId={deepFile}
            initialLayoutAlgo={initialLayoutAlgo}
            expandedClusters={expandedClusters}
            blastOverlay={blastOverlay}
            moduleCycles={moduleCycles}
            layer={layer}
            onLayerChange={setLayer}
            shareUrl={shareUrl}
            onSelectedIdChange={(id) => {
              // Clusters are not file deep links.
              if (id && id.startsWith('cluster:')) return;
              syncArchitectureQuery({ file: id });
            }}
            onLayoutAlgoChange={(algo) => {
              syncArchitectureQuery({ layout: algo === 'elk' ? 'system' : 'flow' });
            }}
            onGraphRebuilt={() => setReloadToken((n) => n + 1)}
            onExpandCluster={(clusterId) => {
              setExpandedClusters((prev) =>
                prev.includes(clusterId) ? prev : [...prev, clusterId]
              );
            }}
            onCollapseCluster={(clusterId) => {
              setExpandedClusters((prev) => prev.filter((id) => id !== clusterId));
            }}
            onNeighborhoodLoaded={(extra) => {
              setNeighborhoodOverlay((prev) => (prev ? mergeForceGraphData(prev, extra) : extra));
            }}
          />
        ) : loading && !indexInProgress ? (
          <div className="ui-diagram__stage ui-diagram__stage--solo">
            <div className="ui-diagram__loading">
              <p>Building diagram…</p>
            </div>
          </div>
        ) : null}
      </div>
  );
}
