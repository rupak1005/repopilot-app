import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Path } from '@phosphor-icons/react';
import { EngineeringLoopStrip } from '../../../components/ui/EngineeringLoopStrip';
import { useDashboardContext, useNeedsIndexHint } from '../../../lib/dashboard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import { PageLoading } from '../../../components/ui/Skeleton';
import { DEMO_HOTSPOTS } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';
import {
  planningCandidatesFromHotspots,
  planningSeedFromQuery,
  type PlanningCandidate
} from '../../../lib/planning';
import { parseEngineeringLoopPull } from '../../../lib/engineeringLoop';
import { architectureHref, impactHref } from '../../../lib/revisionScope';
import { repoApiPath } from '../../../lib/serverApi';
import type { HotspotRow } from '../../../lib/types';

export default function PlanningPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const seed = planningSeedFromQuery(router.query.file);
  const loopPull = parseEngineeringLoopPull(router.query.pull);
  const needsIndex = useNeedsIndexHint(repoId);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const base = repoId ? `/dashboard/${repoId}` : '';
  const repoFullName = dash?.repoFullName;

  useEffect(() => {
    if (!repoId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isDemoMode()) {
          if (!cancelled) setHotspots(DEMO_HOTSPOTS);
          return;
        }
        const response = await fetch(repoApiPath(repoId!, 'hotspots?topK=40&windowDays=30'));
        if (!response.ok) throw new Error('Could not load planning candidates — index first.');
        const data = (await response.json()) as HotspotRow[];
        if (!cancelled) setHotspots(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setHotspots([]);
          setError(err instanceof Error ? err.message : 'Failed to load planning data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  const candidates = useMemo(() => {
    const ranked = planningCandidatesFromHotspots(hotspots, 12);
    if (!seed) return ranked;
    if (ranked.some((row) => row.filePath === seed)) {
      return [ranked.find((row) => row.filePath === seed)!, ...ranked.filter((r) => r.filePath !== seed)];
    }
    return [
      {
        filePath: seed,
        score: 0,
        changeCount: 0,
        reason: 'Seeded from a deep link — run Impact to size the change before opening a PR.'
      } satisfies PlanningCandidate,
      ...ranked
    ];
  }, [hotspots, seed]);

  return (
    <div className="canvas-inner ui-planning-page">
        <div className="page-title-block">
          <h1>Planning</h1>
          <p>
            Plan → agent → PR → impact → review → verify. Candidates come from topography hotspots —
            walk the loop before you cut a PR
            {repoFullName ? (
              <>
                {' '}
                for <span className="mono">{repoFullName}</span>
              </>
            ) : null}
            .
          </p>
        </div>

        {needsIndex ? <IndexHint repoFullName={repoFullName} /> : null}

        {error ? <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner> : null}

        {loading ? <PageLoading label="Building change candidates…" /> : null}

        {!loading && candidates.length === 0 ? (
          <EmptyState
            icon={Path}
            title="No planning candidates yet"
            description="Index the repository so topography hotspots can seed a change plan."
            action={
              base ? (
                <Link className="ui-diagram__action" href={`${base}/hotspots`}>
                  Open Topography →
                </Link>
              ) : undefined
            }
          />
        ) : null}

        {repoId && candidates[0] ? (
          <div className="ui-planning-loop">
            <p className="label-caps">Engineering loop</p>
            <EngineeringLoopStrip
              repoId={repoId}
              filePath={seed ?? candidates[0].filePath}
              pullNumber={loopPull}
              active="plan"
            />
          </div>
        ) : null}

        <ol className="ui-planning-list">
          {candidates.map((candidate, index) => (
            <li key={candidate.filePath} className="ui-planning-card">
              <div className="ui-planning-card__rank" aria-hidden>
                {index + 1}
              </div>
              <div className="ui-planning-card__body">
                <p className="ui-planning-card__path mono">{candidate.filePath}</p>
                <p className="ui-planning-card__reason">{candidate.reason}</p>
                <p className="ui-planning-card__meta">
                  Score {candidate.score.toFixed(2)} · {candidate.changeCount} recent changes
                </p>
                {repoId ? (
                  <>
                    <div className="ui-planning-card__actions">
                      <Link
                        className="ui-diagram__action"
                        href={impactHref(repoId, { file: candidate.filePath })}
                      >
                        Impact
                      </Link>
                      <Link
                        className="ui-diagram__action"
                        href={architectureHref(repoId, {
                          file: candidate.filePath,
                          blast: true
                        })}
                      >
                        Graph blast
                      </Link>
                      <Link className="ui-diagram__action" href={`${base}/mcp`}>
                        Agent
                      </Link>
                      <Link className="ui-diagram__action" href={`${base}/pulls`}>
                        PRs
                      </Link>
                    </div>
                    {index === 0 || candidate.filePath === seed ? (
                      <EngineeringLoopStrip
                        repoId={repoId}
                        filePath={candidate.filePath}
                        pullNumber={loopPull}
                        active="plan"
                        compact
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
  );
}
