import Link from 'next/link';
import { useRouter } from 'next/router';
import { Crosshair, MagnifyingGlass, Warning } from '@phosphor-icons/react';
import { FormEvent, useEffect, useState } from 'react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { ImpactBlastMap } from '../../../components/ui/ImpactBlastMap';
import { IndexHint } from '../../../components/ui/IndexHint';
import { KpiTile } from '../../../components/ui/KpiTile';
import { demoDelay, demoFileImpact } from '../../../lib/demoData';
import {
  DashboardLayout,
  shouldShowIndexHint,
  usePendingIndexJobRepoId,
  useRepoData,
  useRepoIndexStatus
} from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { repoApiPath } from '../../../lib/serverApi';
import type { FileImpactAnalysis } from '../../../lib/types';

export default function ImpactPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const initialFile =
    typeof router.query.file === 'string' ? router.query.file : 'api/src/services/PaymentService.ts';
  const { pulls, analytics, hotspots, error: repoError, loading: repoLoading } = useRepoData(repoId);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const needsIndex = shouldShowIndexHint(
    pulls,
    hotspots,
    analytics,
    indexStatus,
    repoId,
    pendingIndexJobRepoId
  );

  const [filePath, setFilePath] = useState(initialFile);
  const [result, setResult] = useState<FileImpactAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof router.query.file === 'string') {
      setFilePath(router.query.file);
    }
  }, [router.query.file]);

  async function analyze(path: string) {
    if (!repoId || !path.trim()) return;
    const activeRepoId = repoId;
    const target = path.trim();

    setLoading(true);
    setError(null);
    try {
      if (isDemoMode()) {
        await demoDelay(250);
        const demo = demoFileImpact(target);
        if (!demo) {
          throw new Error('No demo impact data for that path — try api/src/services/PaymentService.ts');
        }
        setResult(demo);
        return;
      }

      const response = await fetch(
        repoApiPath(activeRepoId, `impact?filePath=${encodeURIComponent(target)}&depth=2`)
      );
      if (!response.ok) throw new Error('File not found — index the repo or check the path.');
      setResult((await response.json()) as FileImpactAnalysis);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Impact analysis failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!repoId) return;
    const path =
      typeof router.query.file === 'string'
        ? router.query.file
        : 'api/src/services/PaymentService.ts';
    void analyze(path);
  }, [repoId, router.query.file]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoId) return;
    void router.replace(
      { pathname: `/dashboard/${repoId}/impact`, query: { file: filePath.trim() } },
      undefined,
      { shallow: true }
    );
    void analyze(filePath.trim());
  }

  const base = repoId ? `/dashboard/${repoId}` : '';

  return (
    <DashboardLayout activeNav="impact">
      <div className="canvas-inner ui-impact-page">
        <div className="page-title-block">
          <h1>Impact</h1>
          <p>
            What breaks if you change a module? Deterministic graph traversal plus test and history
            signals.
          </p>
        </div>

        {repoError ? <ErrorBanner>{repoError}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}

        <form className="ui-impact-form" onSubmit={handleSubmit}>
          <label className="ui-field-label" htmlFor="impact-file">
            Module path
          </label>
          <div className="ui-impact-form__row">
            <input
              id="impact-file"
              className="ui-input"
              value={filePath}
              onChange={(event) => setFilePath(event.target.value)}
              placeholder="api/src/services/PaymentService.ts"
              spellCheck={false}
            />
            <Button type="submit" variant="primary" disabled={loading || !filePath.trim()}>
              {loading ? 'Analyzing…' : 'Analyze impact'}
            </Button>
          </div>
        </form>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {repoLoading && !result ? <p className="empty-state">Loading repository…</p> : null}

        {result && !loading ? (
          <>
            <p className="ui-impact-page__summary">{result.summary}</p>

            <div className="ui-pr-detail__kpi-grid">
              <KpiTile label="Direct dependents" value={result.directDependents.length} />
              <KpiTile
                label="Transitive dependents"
                value={result.transitiveDependents.length}
                tone="accent"
              />
              <KpiTile label="Relevant tests" value={result.relevantTests.length} tone="warn" />
              <KpiTile
                label="Risk"
                value={result.risk}
                tone={result.risk === 'HIGH' ? 'danger' : result.risk === 'MEDIUM' ? 'warn' : 'success'}
              />
              <KpiTile
                label="Confidence"
                value={result.confidence ?? 'HIGH'}
                tone={
                  (result.confidence ?? 'HIGH') === 'HIGH'
                    ? 'success'
                    : (result.confidence ?? 'HIGH') === 'MEDIUM'
                      ? 'warn'
                      : 'danger'
                }
              />
            </div>

            {(result.riskFactors?.length ?? 0) > 0 ? (
              <div className="ui-impact-factors" aria-label="Why this risk">
                {result.riskFactors.map((factor) => (
                  <div
                    key={factor.id}
                    className={`ui-impact-factor ui-impact-factor--${factor.severity}`}
                  >
                    <p className="ui-impact-factor__label">{factor.label}</p>
                    <p className="ui-impact-factor__detail">{factor.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <BentoPanel title="Blast radius map">
              <ImpactBlastMap
                target={result.target.filePath}
                directDependents={result.directDependents}
                transitiveDependents={result.transitiveDependents}
                outboundImports={result.outboundImports}
                baseHref={base}
              />
              {base ? (
                <p className="ui-impact-blast__link">
                  <Link
                    href={`${base}/architecture?file=${encodeURIComponent(result.target.filePath)}`}
                  >
                    Open in dependency graph →
                  </Link>
                </p>
              ) : null}
            </BentoPanel>

            <div className="ui-pr-detail__grid">
              <BentoPanel title="Blast radius">
                <div className="ui-impact-panel">
                  <p
                    className={`ui-impact-panel__risk ui-impact-panel__risk--${result.risk.toLowerCase()}`}
                  >
                    <Warning size={20} weight="fill" aria-hidden />
                    Risk: {result.risk}
                  </p>
                  {result.directDependents.length > 0 ? (
                    <>
                      <p className="ui-finding-card__category label-caps">Direct dependents</p>
                      <ul className="ui-impact-panel__modules">
                        {result.directDependents.map((mod) => (
                          <li key={mod}>
                            <Link href={`${base}/impact?file=${encodeURIComponent(mod)}`}>{mod}</Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="ui-finding-card__desc">No modules import this file directly.</p>
                  )}
                  {result.transitiveDependents.length > 0 ? (
                    <>
                      <p className="ui-finding-card__category label-caps">Transitive dependents</p>
                      <ul className="ui-impact-panel__modules">
                        {result.transitiveDependents.slice(0, 8).map((mod) => (
                          <li key={mod}>
                            <Link href={`${base}/impact?file=${encodeURIComponent(mod)}`}>{mod}</Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {result.outboundImports.length > 0 ? (
                    <>
                      <p className="ui-finding-card__category label-caps">Imports</p>
                      <ul className="ui-impact-panel__modules">
                        {result.outboundImports.map((mod) => (
                          <li key={mod}>{mod}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </BentoPanel>

              <BentoPanel title="Safe-change checklist">
                <ul className="ui-impact-checklist">
                  {result.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </BentoPanel>
            </div>

            <BentoPanel title={`Recommended tests (${result.relevantTests.length})`}>
              {result.relevantTests.length > 0 ? (
                <ul className="ui-impact-tests">
                  {result.relevantTests.map((test) => (
                    <li key={test.filePath} className="ui-impact-test">
                      <p className="mono ui-impact-test__path">{test.filePath}</p>
                      <p className="ui-impact-test__reason">{test.reason}</p>
                      <span className="label-caps">{test.confidence} confidence</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  title="No related tests found"
                  description="No test files import this module in the dependency graph."
                />
              )}
            </BentoPanel>

            {result.coChanges.length > 0 ? (
              <BentoPanel title="Co-change history">
                <ul className="ui-similar-list">
                  {result.coChanges.map((pair) => (
                    <li key={pair.pairedWith} className="ui-similar-item">
                      <p className="ui-similar-item__title">{pair.pairedWith}</p>
                      <p className="ui-similar-item__meta">{pair.count} shared commits</p>
                    </li>
                  ))}
                </ul>
              </BentoPanel>
            ) : null}

            {result.hotspot ? (
              <BentoPanel title="Hotspot overlay">
                <div className="ui-impact-panel">
                  <p className="ui-finding-card__desc">
                    Score {result.hotspot.score.toFixed(0)} · {result.hotspot.changeCount} recent
                    changes
                  </p>
                  {result.hotspot.reasons.length > 0 ? (
                    <ul className="ui-impact-panel__modules">
                      {result.hotspot.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Link className="ui-diagram__action" href={`${base}/hotspots`}>
                    View all hotspots
                  </Link>
                </div>
              </BentoPanel>
            ) : null}
          </>
        ) : loading ? (
          <EmptyState
            icon={Crosshair}
            title="Analyzing impact…"
            description="Traversing the dependency graph."
          />
        ) : (
          <EmptyState
            icon={MagnifyingGlass}
            title="Enter a module path"
            description="Try api/src/services/PaymentService.ts or web/lib/askThread.ts in demo mode."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
