import Link from 'next/link';
import { useRouter } from 'next/router';
import { MagnifyingGlass, Warning } from '@phosphor-icons/react';
import { FormEvent, useEffect, useState } from 'react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { ImpactBlastGraph } from '../../../components/ui/ImpactBlastGraph';
import { ImpactBlastMap } from '../../../components/ui/ImpactBlastMap';
import { IndexHint } from '../../../components/ui/IndexHint';
import { KpiTile } from '../../../components/ui/KpiTile';
import { PageLoading } from '../../../components/ui/Skeleton';
import { DEMO_REVISIONS, demoDelay, demoFileImpact, demoOwnership, demoPullImpact } from '../../../lib/demoData';
import { mcpContextPackSnippet } from '../../../lib/mcpConnect';
import { formatOwnershipLabel, githubOwnerHref, type OwnershipSummary } from '../../../lib/ownership';
import { shouldShowIndexHint, useDashboardContext, usePendingIndexJobRepoId, useRepoData, useRepoIndexStatus } from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { type RevisionRow } from '../../../lib/history';
import {
  REVISION_QUERY_KEY,
  architectureHref,
  impactHref,
  impactRouteQuery,
  matchRevisionValue,
  parseRevisionQuery,
  revisionSelectLabel,
  withRevisionSha
} from '../../../lib/revisionScope';
import { repoApiPath } from '../../../lib/serverApi';
import type { FileImpactAnalysis, PullImpactAnalysis, SymbolImpactAnalysis } from '../../../lib/types';

type ImpactMode = 'file' | 'pull' | 'symbol';

const DEMO_FILE = 'api/src/services/PaymentService.ts';
const DEMO_SYMBOL = 'PaymentService';
const DEMO_PULL = '42';

function resolveImpactMode(query: {
  file?: string | string[];
  pull?: string | string[];
  pullNumber?: string | string[];
  symbol?: string | string[];
  symbolName?: string | string[];
}): ImpactMode {
  if (typeof query.symbol === 'string' || typeof query.symbolName === 'string') return 'symbol';
  if (typeof query.pull === 'string' || typeof query.pullNumber === 'string') return 'pull';
  return 'file';
}

function queryString(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export default function ImpactPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const queryMode = resolveImpactMode(router.query);
  const demo = isDemoMode();
  const initialFile =
    queryString(router.query.file) ?? (demo ? DEMO_FILE : '');
  const initialPull =
    queryString(router.query.pull) ??
    queryString(router.query.pullNumber) ??
    (demo ? DEMO_PULL : '');
  const initialSymbol =
    queryString(router.query.symbol) ??
    queryString(router.query.symbolName) ??
    (demo ? DEMO_SYMBOL : '');

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

  const [mode, setMode] = useState<ImpactMode>(queryMode);
  const [filePath, setFilePath] = useState(initialFile);
  const [pullNumber, setPullNumber] = useState(initialPull);
  const [symbolName, setSymbolName] = useState(initialSymbol);
  const [fileResult, setFileResult] = useState<FileImpactAnalysis | null>(null);
  const [pullResult, setPullResult] = useState<PullImpactAnalysis | null>(null);
  const [symbolResult, setSymbolResult] = useState<SymbolImpactAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const revisionSha = parseRevisionQuery(router.query[REVISION_QUERY_KEY]);

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
    setMode(queryMode);
    if (typeof router.query.file === 'string') setFilePath(router.query.file);
    if (typeof router.query.pull === 'string') setPullNumber(router.query.pull);
    if (typeof router.query.pullNumber === 'string') setPullNumber(router.query.pullNumber);
    if (typeof router.query.symbol === 'string') setSymbolName(router.query.symbol);
    if (typeof router.query.symbolName === 'string') setSymbolName(router.query.symbolName);
  }, [
    queryMode,
    router.query.file,
    router.query.pull,
    router.query.pullNumber,
    router.query.symbol,
    router.query.symbolName
  ]);

  async function analyzeFile(path: string) {
    if (!repoId || !path.trim()) return;
    setLoading(true);
    setError(null);
    setPullResult(null);
    setSymbolResult(null);
    try {
      if (isDemoMode()) {
        await demoDelay(250);
        const demo = demoFileImpact(path.trim());
        if (!demo) {
          throw new Error('No demo impact data for that path — try api/src/services/PaymentService.ts');
        }
        setFileResult(demo);
        return;
      }
      const response = await fetch(
        repoApiPath(
          repoId,
          withRevisionSha(
            `impact?filePath=${encodeURIComponent(path.trim())}&depth=2`,
            revisionSha
          )
        )
      );
      if (!response.ok) throw new Error('File not found — index the repo or check the path.');
      setFileResult((await response.json()) as FileImpactAnalysis);
    } catch (err) {
      setFileResult(null);
      setError(err instanceof Error ? err.message : 'Impact analysis failed');
    } finally {
      setLoading(false);
    }
  }

  async function analyzePull(raw: string) {
    if (!repoId || !raw.trim()) return;
    const n = Number(raw.trim());
    if (!Number.isFinite(n) || n < 1) {
      setError('Enter a valid pull request number');
      return;
    }
    setLoading(true);
    setError(null);
    setFileResult(null);
    setSymbolResult(null);
    try {
      if (isDemoMode()) {
        await demoDelay(250);
        const demo = demoPullImpact(n);
        if (!demo) throw new Error('No demo PR impact for that number — try 42');
        setPullResult({
          mode: 'pull',
          pullNumber: n,
          title: `Demo PR #${n}`,
          revisionSha: 'demo',
          risk: demo.risk,
          confidence: 'HIGH',
          riskFactors: [
            {
              id: 'files',
              label: 'Changed modules',
              detail: `${demo.changedModules.length} modules in the change set`,
              severity: demo.risk === 'HIGH' ? 'danger' : 'warn'
            }
          ],
          changedFiles: demo.changedModules,
          analyzedFiles: demo.changedModules,
          skippedFiles: 0,
          directDependents: Array.from({ length: demo.directDependents }, (_, i) => `dep/${i}.ts`),
          transitiveDependents: Array.from(
            { length: Math.min(demo.transitiveDependents, 8) },
            (_, i) => `trans/${i}.ts`
          ),
          relevantTests: [],
          fileRisks: demo.changedModules.map((filePath) => ({
            filePath,
            risk: demo.risk,
            confidence: 'HIGH' as const
          })),
          checklist: [
            'Review changed modules in the PR.',
            'Run related tests before merge.',
            demo.note ?? 'Confirm CI is green.'
          ],
          summary: `Demo PR #${n} risk ${demo.risk} with ${demo.directDependents} direct dependents.`
        });
        return;
      }
      const response = await fetch(
        repoApiPath(repoId, withRevisionSha(`impact?pullNumber=${n}&depth=2`, revisionSha))
      );
      if (!response.ok) throw new Error('Pull request not found or not indexed.');
      setPullResult((await response.json()) as PullImpactAnalysis);
    } catch (err) {
      setPullResult(null);
      setError(err instanceof Error ? err.message : 'PR impact analysis failed');
    } finally {
      setLoading(false);
    }
  }

  async function analyzeSymbol(name: string) {
    if (!repoId || !name.trim()) return;
    setLoading(true);
    setError(null);
    setFileResult(null);
    setPullResult(null);
    try {
      if (isDemoMode()) {
        await demoDelay(250);
        setSymbolResult({
          mode: 'symbol',
          target: {
            symbolId: 'demo-symbol',
            name: name.trim(),
            type: 'function',
            filePath: 'api/src/services/PaymentService.ts'
          },
          revisionSha: 'demo',
          risk: 'HIGH',
          confidence: 'MEDIUM',
          riskFactors: [
            {
              id: 'direct',
              label: 'Direct callers',
              detail: '3 symbols call this target',
              severity: 'warn'
            },
            {
              id: 'cycle',
              label: 'Call cycle',
              detail: 'Demo cycle signal for illustration',
              severity: 'danger'
            }
          ],
          directCallers: [
            { symbolId: '1', name: 'checkout', type: 'function' },
            { symbolId: '2', name: 'renew', type: 'function' },
            { symbolId: '3', name: 'workerTick', type: 'function' }
          ],
          transitiveCallers: [{ symbolId: '4', name: 'handleWebhook', type: 'function' }],
          cycleDetected: true,
          relevantTests: [
            {
              filePath: 'api/src/services/PaymentService.test.ts',
              reason: 'Imports the containing module directly.',
              confidence: 'HIGH'
            }
          ],
          coChanges: [],
          hotspot: { score: 62, changeCount: 14, reasons: ['high churn'] },
          checklist: [
            'Inspect direct callers before changing the symbol signature.',
            'Run PaymentService tests.',
            'Break or carefully review the call cycle before merging.'
          ],
          summary: `Demo symbol ${name.trim()} has 3 direct and 1 transitive callers. Call cycle detected.`
        });
        return;
      }
      const response = await fetch(
        repoApiPath(
          repoId,
          withRevisionSha(
            `impact?symbolName=${encodeURIComponent(name.trim())}&depth=2`,
            revisionSha
          )
        )
      );
      if (!response.ok) throw new Error('Symbol not found — check the name or index the repo.');
      setSymbolResult((await response.json()) as SymbolImpactAnalysis);
    } catch (err) {
      setSymbolResult(null);
      setError(err instanceof Error ? err.message : 'Symbol impact analysis failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!repoId) return;
    if (queryMode === 'pull') {
      const pull =
        queryString(router.query.pull) ??
        queryString(router.query.pullNumber) ??
        (demo ? DEMO_PULL : null);
      if (pull) void analyzePull(pull);
      else {
        setPullResult(null);
        setError(null);
      }
      return;
    }
    if (queryMode === 'symbol') {
      const symbol =
        queryString(router.query.symbol) ??
        queryString(router.query.symbolName) ??
        (demo ? DEMO_SYMBOL : null);
      if (symbol) void analyzeSymbol(symbol);
      else {
        setSymbolResult(null);
        setError(null);
      }
      return;
    }
    const file = queryString(router.query.file) ?? (demo ? DEMO_FILE : null);
    if (file) void analyzeFile(file);
    else {
      setFileResult(null);
      setError(null);
    }
  }, [
    repoId,
    queryMode,
    revisionSha,
    demo,
    router.query.file,
    router.query.pull,
    router.query.pullNumber,
    router.query.symbol,
    router.query.symbolName
  ]);

  function switchMode(next: ImpactMode) {
    if (!repoId) return;
    setMode(next);
    const values = {
      file: filePath.trim(),
      pull: pullNumber.trim(),
      symbol: symbolName.trim()
    };
    void router.replace(
      { pathname: `/dashboard/${repoId}/impact`, query: impactRouteQuery(next, values, revisionSha) },
      undefined,
      { shallow: true }
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoId) return;
    const values = {
      file: filePath.trim(),
      pull: pullNumber.trim(),
      symbol: symbolName.trim()
    };
    void router.replace(
      { pathname: `/dashboard/${repoId}/impact`, query: impactRouteQuery(mode, values, revisionSha) },
      undefined,
      { shallow: true }
    );
    if (mode === 'file') {
      void analyzeFile(filePath.trim());
      return;
    }
    if (mode === 'pull') {
      void analyzePull(pullNumber.trim());
      return;
    }
    void analyzeSymbol(symbolName.trim());
  }

  function onRevisionChange(next: string) {
    if (!repoId) return;
    const values = {
      file: filePath.trim(),
      pull: pullNumber.trim(),
      symbol: symbolName.trim()
    };
    void router.replace(
      {
        pathname: `/dashboard/${repoId}/impact`,
        query: impactRouteQuery(mode, values, next || null)
      },
      undefined,
      { shallow: true }
    );
  }

  const base = repoId ? `/dashboard/${repoId}` : '';
  const result =
    mode === 'file' ? fileResult : mode === 'pull' ? pullResult : symbolResult;
  const selectedRevisionValue = matchRevisionValue(revisions, revisionSha);

  return (
    <div className="canvas-inner ui-impact-page">
        <div className="page-title-block">
          <h1>Impact</h1>
          <p>What breaks if this module or PR changes — graph traversal plus tests and history.</p>
        </div>

        {repoError ? <ErrorBanner>{repoError}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}

        {revisions.length > 0 ? (
          <label className="ui-diagram-rev ui-impact-rev">
            <span className="label-caps">Revision</span>
            <select
              className="ui-diagram-rev__select"
              value={selectedRevisionValue}
              onChange={(event) => onRevisionChange(event.target.value)}
              aria-label="Indexed revision for impact analysis"
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

        <div className="ui-impact-modes" role="tablist" aria-label="Impact mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'file'}
            className={`ui-impact-mode${mode === 'file' ? ' ui-impact-mode--active' : ''}`}
            onClick={() => switchMode('file')}
          >
            File impact
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'symbol'}
            className={`ui-impact-mode${mode === 'symbol' ? ' ui-impact-mode--active' : ''}`}
            onClick={() => switchMode('symbol')}
          >
            Symbol impact
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'pull'}
            className={`ui-impact-mode${mode === 'pull' ? ' ui-impact-mode--active' : ''}`}
            onClick={() => switchMode('pull')}
          >
            PR impact
          </button>
        </div>

        <form className="ui-impact-form" onSubmit={handleSubmit}>
          <label className="ui-field-label" htmlFor="impact-input">
            {mode === 'file'
              ? 'Module path'
              : mode === 'symbol'
                ? 'Symbol name'
                : 'Pull request number'}
          </label>
          <div className="ui-impact-form__row">
            {mode === 'file' ? (
              <input
                id="impact-input"
                className="ui-input"
                value={filePath}
                onChange={(event) => setFilePath(event.target.value)}
                placeholder={
                  demo
                    ? DEMO_FILE
                    : hotspots[0]?.filePath ?? 'e.g. api/src/server.ts'
                }
                spellCheck={false}
              />
            ) : mode === 'symbol' ? (
              <input
                id="impact-input"
                className="ui-input"
                value={symbolName}
                onChange={(event) => setSymbolName(event.target.value)}
                placeholder={demo ? DEMO_SYMBOL : 'e.g. startPublicRepositoryIndex'}
                spellCheck={false}
              />
            ) : (
              <input
                id="impact-input"
                className="ui-input"
                value={pullNumber}
                onChange={(event) => setPullNumber(event.target.value)}
                placeholder={demo ? DEMO_PULL : 'e.g. 12'}
                inputMode="numeric"
              />
            )}
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Analyzing…' : 'Analyze impact'}
            </Button>
          </div>
        </form>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {repoLoading && !result ? <PageLoading label="Loading repository…" /> : null}

        {fileResult && mode === 'file' && !loading ? (
          <FileImpactView result={fileResult} base={base} repoId={repoId} revisionSha={revisionSha} />
        ) : null}

        {symbolResult && mode === 'symbol' && !loading ? (
          <SymbolImpactView
            result={symbolResult}
            base={base}
            repoId={repoId}
            revisionSha={revisionSha}
          />
        ) : null}

        {pullResult && mode === 'pull' && !loading ? (
          <PullImpactView result={pullResult} base={base} repoId={repoId} revisionSha={revisionSha} />
        ) : null}

        {loading ? <PageLoading label="Analyzing impact…" /> : null}

        {!loading && !result && !error ? (
          <EmptyState
            icon={MagnifyingGlass}
            title={
              mode === 'file'
                ? 'Enter a module path'
                : mode === 'symbol'
                  ? 'Enter a symbol name'
                  : 'Enter a pull number'
            }
            description={
              mode === 'file'
                ? demo
                  ? `Try ${DEMO_FILE} in demo mode.`
                  : hotspots[0]?.filePath
                    ? `Start with a hotspot like ${hotspots[0].filePath}, or paste any indexed module path.`
                    : 'Paste a module path from Architecture, Search, or Hotspots.'
                : mode === 'symbol'
                  ? demo
                    ? `Try ${DEMO_SYMBOL} in demo mode.`
                    : 'Enter an exported function, class, or type name from the index.'
                  : demo
                    ? `Try pull ${DEMO_PULL} in demo mode.`
                    : 'Enter a GitHub pull request number for this repository.'
            }
          />
        ) : null}
      </div>
  );
}

function FileImpactView({
  result,
  base,
  repoId,
  revisionSha
}: {
  result: FileImpactAnalysis;
  base: string;
  repoId: string | null;
  revisionSha: string | null;
}) {
  const router = useRouter();
  const [packHint, setPackHint] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<OwnershipSummary | null>(null);
  const dash = useDashboardContext();
  const repoFullName = dash?.repoFullName;

  useEffect(() => {
    if (!repoId) {
      setOwnership(null);
      return;
    }
    let cancelled = false;
    async function loadOwners() {
      try {
        if (isDemoMode()) {
          if (!cancelled) setOwnership(demoOwnership(result.target.filePath));
          return;
        }
        const response = await fetch(
          repoApiPath(
            repoId!,
            withRevisionSha(
              `ownership?path=${encodeURIComponent(result.target.filePath)}`,
              revisionSha
            )
          )
        );
        if (!response.ok) throw new Error('ownership unavailable');
        const data = (await response.json()) as OwnershipSummary;
        if (!cancelled) setOwnership(data);
      } catch {
        if (!cancelled) setOwnership(null);
      }
    }
    void loadOwners();
    return () => {
      cancelled = true;
    };
  }, [repoId, result.target.filePath, revisionSha]);

  async function copyContextPack() {
    if (!repoId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(
        mcpContextPackSnippet({
          repositoryId: repoId,
          filePath: result.target.filePath,
          question: `what breaks if ${result.target.filePath} changes?`
        })
      );
      setPackHint('Copied');
      window.setTimeout(() => setPackHint(null), 1600);
    } catch {
      setPackHint('Copy failed');
      window.setTimeout(() => setPackHint(null), 1600);
    }
  }

  return (
    <div className="ui-impact-result">
      <p className="ui-impact-page__summary">{result.summary}</p>
      <ImpactKpis
        direct={result.directDependents.length}
        transitive={result.transitiveDependents.length}
        tests={result.relevantTests.length}
        risk={result.risk}
        confidence={result.confidence}
      />
      <RiskFactors factors={result.riskFactors} />

      {ownership && (ownership.owners.length > 0 || ownership.sourcePath) ? (
        <div className="ui-impact-ownership-bar">
          <div className="ui-impact-ownership-bar__copy">
            <span className="label-caps">Owners</span>
            <p>
              {ownership.owners.length > 0
                ? `CODEOWNERS for ${shortPath(result.target.filePath)}`
                : `No path match in ${ownership.sourcePath ?? 'CODEOWNERS'}`}
            </p>
          </div>
          {ownership.owners.length > 0 ? (
            <ul className="ui-impact-ownership__list">
              {ownership.owners.map((owner) => {
                const href = githubOwnerHref(owner, repoFullName);
                return (
                  <li key={owner}>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="ui-impact-owner-chip">
                        {owner}
                      </a>
                    ) : (
                      <span className="ui-impact-owner-chip mono">{owner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ui-impact-ownership__empty mono">{formatOwnershipLabel([])}</p>
          )}
          {ownership.sourcePath ? (
            <p className="ui-impact-ownership__source mono">{ownership.sourcePath}</p>
          ) : null}
        </div>
      ) : null}

      <div className="ui-impact-result__main ui-bento-grid">
        <BentoPanel
          title="Blast radius"
          action={
            repoId ? (
              <Link
                href={architectureHref(repoId, {
                  file: result.target.filePath,
                  blast: true,
                  revisionSha
                })}
              >
                Open graph →
              </Link>
            ) : undefined
          }
        >
          <div className="ui-impact-blast-wrap">
            <p className={`ui-impact-panel__risk ui-impact-panel__risk--${result.risk.toLowerCase()}`}>
              <Warning size={18} weight="fill" aria-hidden />
              Risk: {result.risk}
            </p>
            <ImpactBlastGraph
              impact={result}
              repoId={repoId}
              revisionSha={revisionSha}
              onSelectFile={(file) => {
                if (!repoId) return;
                void router.push(impactHref(repoId, { file, revisionSha }));
              }}
            />
            <ImpactBlastMap
              target={result.target.filePath}
              directDependents={result.directDependents}
              transitiveDependents={result.transitiveDependents}
              outboundImports={result.outboundImports}
              baseHref={base}
              repoId={repoId}
              revisionSha={revisionSha}
            />
          </div>
        </BentoPanel>

        <div className="ui-impact-result__aside">
          <BentoPanel title="Safe-change checklist">
            <ul className="ui-impact-checklist">
              {result.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </BentoPanel>
          <BentoPanel title={`Tests to run (${result.relevantTests.length})`}>
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
                description="No test files import these modules in the dependency graph."
              />
            )}
          </BentoPanel>
        </div>
      </div>

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
      {(result.similarChanges?.length ?? 0) > 0 ? (
        <BentoPanel title="Similar past changes">
          <ul className="ui-similar-list">
            {result.similarChanges!.map((item) => (
              <li key={item.pullNumber} className="ui-similar-item">
                <p className="ui-similar-item__title">
                  {item.similarity != null
                    ? `${Math.round(item.similarity * 100)}% similar to PR #${item.pullNumber}`
                    : `PR #${item.pullNumber}`}
                  {' — '}
                  {item.title}
                </p>
                <p className="ui-similar-item__meta">
                  Overlap: {item.overlapFiles.slice(0, 4).join(', ')}
                  {item.overlapFiles.length > 4 ? '…' : ''}
                </p>
                {repoId ? (
                  <Link
                    className="ui-diagram__action"
                    href={`/dashboard/${repoId}/pulls/${item.pullNumber}`}
                  >
                    View PR
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </BentoPanel>
      ) : null}
      {result.hotspot ? (
        <BentoPanel title="Hotspot overlay">
          <div className="ui-impact-panel">
            <p className="ui-finding-card__desc">
              Score {result.hotspot.score.toFixed(0)} · {result.hotspot.changeCount} recent changes
            </p>
            <Link className="ui-diagram__action" href={`${base}/hotspots`}>
              View topography
            </Link>
          </div>
        </BentoPanel>
      ) : null}
      {repoId ? (
        <BentoPanel title="Handoff">
          <div className="ui-impact-handoff">
            <p className="ui-finding-card__desc">
              Carry this blast radius into a change plan or agent tooling before you open a PR.
            </p>
            <div className="ui-impact-handoff__actions">
              <Link
                className="ui-diagram__action"
                href={`/dashboard/${repoId}/planning?file=${encodeURIComponent(result.target.filePath)}`}
              >
                Plan this change
              </Link>
              <button type="button" className="ui-diagram__action" onClick={() => void copyContextPack()}>
                {packHint ?? 'Copy context pack'}
              </button>
              <Link className="ui-diagram__action" href={`/dashboard/${repoId}/mcp`}>
                MCP / agents
              </Link>
              <Link
                className="ui-diagram__action"
                href={architectureHref(repoId, {
                  file: result.target.filePath,
                  blast: true,
                  revisionSha
                })}
              >
                Graph blast
              </Link>
            </div>
          </div>
        </BentoPanel>
      ) : null}
    </div>
  );
}

function shortPath(path: string): string {
  const parts = path.split('/');
  return parts.length <= 2 ? path : parts.slice(-2).join('/');
}

function SymbolImpactView({
  result,
  base,
  repoId,
  revisionSha
}: {
  result: SymbolImpactAnalysis;
  base: string;
  repoId: string | null;
  revisionSha: string | null;
}) {
  return (
    <>
      <p className="ui-impact-page__summary">{result.summary}</p>
      <ImpactKpis
        direct={result.directCallers.length}
        transitive={result.transitiveCallers.length}
        tests={result.relevantTests.length}
        risk={result.risk}
        confidence={result.confidence}
      />
      <RiskFactors factors={result.riskFactors} />
      <BentoPanel title="Caller blast map">
        <ImpactBlastMap
          target={`${result.target.type} ${result.target.name}`}
          directDependents={result.directCallers.map((c) => `${c.name} (${c.type})`)}
          transitiveDependents={result.transitiveCallers.map((c) => `${c.name} (${c.type})`)}
          outboundImports={[result.target.filePath]}
          baseHref={base}
          repoId={repoId}
          revisionSha={revisionSha}
        />
        {repoId ? (
          <p className="ui-impact-blast__link">
            <Link href={impactHref(repoId, { file: result.target.filePath, revisionSha })}>
              Open containing file impact →
            </Link>
          </p>
        ) : null}
      </BentoPanel>
      <ImpactLists
        base={base}
        repoId={repoId}
        revisionSha={revisionSha}
        risk={result.risk}
        directDependents={result.directCallers.map((c) => `${c.name} · ${result.target.filePath}`)}
        transitiveDependents={result.transitiveCallers.map((c) => c.name)}
        checklist={result.checklist}
        tests={result.relevantTests}
      />
      {result.cycleDetected ? (
        <BentoPanel title="Call cycle">
          <p className="ui-finding-card__desc">
            This symbol is part of a strongly connected call component — treat signature changes as
            high risk.
          </p>
        </BentoPanel>
      ) : null}
    </>
  );
}

function PullImpactView({
  result,
  base,
  repoId,
  revisionSha
}: {
  result: PullImpactAnalysis;
  base: string;
  repoId: string | null;
  revisionSha: string | null;
}) {
  return (
    <>
      <p className="ui-impact-page__summary">{result.summary}</p>
      <ImpactKpis
        direct={result.directDependents.length}
        transitive={result.transitiveDependents.length}
        tests={result.relevantTests.length}
        risk={result.risk}
        confidence={result.confidence}
      />
      <RiskFactors factors={result.riskFactors} />
      <BentoPanel title="Blast radius map">
        <ImpactBlastMap
          target={`PR #${result.pullNumber}`}
          directDependents={result.directDependents}
          transitiveDependents={result.transitiveDependents}
          outboundImports={result.changedFiles.slice(0, 8)}
          baseHref={base}
          repoId={repoId}
          revisionSha={revisionSha}
        />
        {base ? (
          <p className="ui-impact-blast__link">
            <Link href={`${base}/pulls/${result.pullNumber}`}>Open pull request →</Link>
          </p>
        ) : null}
      </BentoPanel>
      <BentoPanel title={`Changed files (${result.changedFiles.length})`}>
        <ul className="ui-impact-panel__modules">
          {result.fileRisks.map((file) => (
            <li key={file.filePath}>
              <Link
                href={
                  repoId
                    ? impactHref(repoId, { file: file.filePath, revisionSha })
                    : `${base}/impact?file=${encodeURIComponent(file.filePath)}`
                }
              >
                {file.filePath}
              </Link>{' '}
              <span className="label-caps">
                {file.risk} · {file.confidence}
              </span>
            </li>
          ))}
          {result.skippedFiles > 0 ? (
            <li className="ui-finding-card__desc">
              +{result.skippedFiles} more changed file{result.skippedFiles === 1 ? '' : 's'} not
              analyzed (cap)
            </li>
          ) : null}
        </ul>
      </BentoPanel>
      <ImpactLists
        base={base}
        repoId={repoId}
        revisionSha={revisionSha}
        risk={result.risk}
        directDependents={result.directDependents}
        transitiveDependents={result.transitiveDependents}
        checklist={result.checklist}
        tests={result.relevantTests}
      />
    </>
  );
}

function ImpactKpis(props: {
  direct: number;
  transitive: number;
  tests: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}) {
  return (
    <div className="ui-pr-detail__kpi-grid">
      <KpiTile label="Direct dependents" value={props.direct} />
      <KpiTile label="Transitive dependents" value={props.transitive} tone="accent" />
      <KpiTile label="Relevant tests" value={props.tests} tone="warn" />
      <KpiTile
        label="Risk"
        value={props.risk}
        tone={props.risk === 'HIGH' ? 'danger' : props.risk === 'MEDIUM' ? 'warn' : 'success'}
      />
      <KpiTile
        label="Confidence"
        value={props.confidence}
        tone={
          props.confidence === 'HIGH' ? 'success' : props.confidence === 'MEDIUM' ? 'warn' : 'danger'
        }
      />
    </div>
  );
}

function RiskFactors({
  factors
}: {
  factors: FileImpactAnalysis['riskFactors'];
}) {
  if (!factors?.length) return null;
  return (
    <div className="ui-impact-factors" aria-label="Why this risk">
      {factors.map((factor) => (
        <div key={factor.id} className={`ui-impact-factor ui-impact-factor--${factor.severity}`}>
          <p className="ui-impact-factor__label">{factor.label}</p>
          <p className="ui-impact-factor__detail">{factor.detail}</p>
        </div>
      ))}
    </div>
  );
}

function ImpactLists(props: {
  base: string;
  repoId?: string | null;
  revisionSha?: string | null;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports?: string[];
  checklist: string[];
  tests: FileImpactAnalysis['relevantTests'];
}) {
  function fileLink(mod: string) {
    if (props.repoId) return impactHref(props.repoId, { file: mod, revisionSha: props.revisionSha });
    return `${props.base}/impact?file=${encodeURIComponent(mod)}`;
  }

  return (
    <>
      <div className="ui-pr-detail__grid">
        <BentoPanel title="Blast radius">
          <div className="ui-impact-panel">
            <p className={`ui-impact-panel__risk ui-impact-panel__risk--${props.risk.toLowerCase()}`}>
              <Warning size={20} weight="fill" aria-hidden />
              Risk: {props.risk}
            </p>
            {props.directDependents.length > 0 ? (
              <>
                <p className="ui-finding-card__category label-caps">Direct dependents</p>
                <ul className="ui-impact-panel__modules">
                  {props.directDependents.map((mod) => (
                    <li key={mod}>
                      <Link href={fileLink(mod)}>{mod}</Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="ui-finding-card__desc">No external direct dependents.</p>
            )}
            {props.transitiveDependents.length > 0 ? (
              <>
                <p className="ui-finding-card__category label-caps">Transitive dependents</p>
                <ul className="ui-impact-panel__modules">
                  {props.transitiveDependents.slice(0, 8).map((mod) => (
                    <li key={mod}>
                      <Link href={fileLink(mod)}>{mod}</Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {props.outboundImports && props.outboundImports.length > 0 ? (
              <>
                <p className="ui-finding-card__category label-caps">Imports</p>
                <ul className="ui-impact-panel__modules">
                  {props.outboundImports.map((mod) => (
                    <li key={mod}>{mod}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </BentoPanel>
        <BentoPanel title="Safe-change checklist">
          <ul className="ui-impact-checklist">
            {props.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </BentoPanel>
      </div>
      <BentoPanel title={`Recommended tests (${props.tests.length})`}>
        {props.tests.length > 0 ? (
          <ul className="ui-impact-tests">
            {props.tests.map((test) => (
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
            description="No test files import these modules in the dependency graph."
          />
        )}
      </BentoPanel>
    </>
  );
}
