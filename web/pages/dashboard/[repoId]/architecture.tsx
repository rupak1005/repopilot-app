import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { GitBranch } from '@phosphor-icons/react';
import { ArchitectureGraphView } from '../../../components/ui/ArchitectureGraph';
import { DifferentiatorsStrip } from '../../../components/ui/DifferentiatorsStrip';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import { DashboardLayout, usePendingIndexJobRepoId, useRepoIndexStatus } from '../../../lib/dashboard';
import { isRepoIndexInProgress } from '../../../lib/indexStatus';
import { toForceGraphData, type ArchitectureGraph } from '../../../lib/architecture';
import { repoApiPath } from '../../../lib/serverApi';
import { DEMO_ARCHITECTURE } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';

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
  const prevIndexState = useRef<string | undefined>(undefined);

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
        const response = await fetch(repoApiPath(activeRepoId, 'architecture'));
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
  }, [repoId, reloadToken]);

  const forceData = useMemo(() => (graph ? toForceGraphData(graph) : null), [graph]);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const indexInProgress = isRepoIndexInProgress(repoId, indexStatus, pendingIndexJobRepoId);
  const empty = graph && graph.nodes.length === 0;
  const slug = repoFullName || repoId || '…';

  useEffect(() => {
    const prev = prevIndexState.current;
    prevIndexState.current = indexStatus?.state;
    if (prev === 'indexing' && indexStatus?.state === 'ready') {
      setReloadToken((n) => n + 1);
    }
  }, [indexStatus?.state]);

  return (
    <DashboardLayout activeNav="architecture" canvasClass="canvas--diagram">
      <div className="ui-diagram-page">
        <header className="ui-diagram-hero">
          <div>
            <p className="ui-diagram-hero__eyebrow label-caps">Repository → diagram</p>
            <h1>See how your codebase fits together</h1>
            <p className="ui-diagram-hero__sub">
              Interactive module map from real dependency edges — not AI-generated Mermaid. Click
              through to GitHub, search, or impact analysis.
            </p>
          </div>
          <div className="ui-diagram-repo-bar" aria-label="Current repository">
            <GitBranch size={16} weight="bold" aria-hidden />
            <span className="mono">{slug}</span>
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
            repoFullName={repoFullName || undefined}
            repoId={repoId ?? undefined}
            loading={loading}
            onGraphRebuilt={() => setReloadToken((n) => n + 1)}
          />
        ) : loading && !indexInProgress ? (
          <div className="ui-diagram__stage ui-diagram__stage--solo">
            <div className="ui-diagram__loading">
              <p>Building diagram…</p>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
