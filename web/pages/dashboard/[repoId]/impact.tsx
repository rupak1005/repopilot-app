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
import { demoDelay, demoFileImpact, demoPullImpact } from '../../../lib/demoData';
import {
  DashboardLayout,
  shouldShowIndexHint,
  usePendingIndexJobRepoId,
  useRepoData,
  useRepoIndexStatus
} from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { repoApiPath } from '../../../lib/serverApi';
import type { FileImpactAnalysis, PullImpactAnalysis, SymbolImpactAnalysis } from '../../../lib/types';

type ImpactMode = 'file' | 'pull' | 'symbol';

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

export default function ImpactPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const queryMode = resolveImpactMode(router.query);
  const initialFile =
    typeof router.query.file === 'string' ? router.query.file : 'api/src/services/PaymentService.ts';
  const initialPull =
    typeof router.query.pull === 'string'
      ? router.query.pull
      : typeof router.query.pullNumber === 'string'
        ? router.query.pullNumber
        : '42';
  const initialSymbol =
    typeof router.query.symbol === 'string'
      ? router.query.symbol
      : typeof router.query.symbolName === 'string'
        ? router.query.symbolName
        : 'PaymentService';

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
        repoApiPath(repoId, `impact?filePath=${encodeURIComponent(path.trim())}&depth=2`)
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
      const response = await fetch(repoApiPath(repoId, `impact?pullNumber=${n}&depth=2`));
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
        repoApiPath(repoId, `impact?symbolName=${encodeURIComponent(name.trim())}&depth=2`)
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
      void analyzePull(
        typeof router.query.pull === 'string'
          ? router.query.pull
          : typeof router.query.pullNumber === 'string'
            ? router.query.pullNumber
            : '42'
      );
      return;
    }
    if (queryMode === 'symbol') {
      void analyzeSymbol(
        typeof router.query.symbol === 'string'
          ? router.query.symbol
          : typeof router.query.symbolName === 'string'
            ? router.query.symbolName
            : 'PaymentService'
      );
      return;
    }
    void analyzeFile(
      typeof router.query.file === 'string'
        ? router.query.file
        : 'api/src/services/PaymentService.ts'
    );
  }, [
    repoId,
    queryMode,
    router.query.file,
    router.query.pull,
    router.query.pullNumber,
    router.query.symbol,
    router.query.symbolName
  ]);

  function switchMode(next: ImpactMode) {
    if (!repoId) return;
    setMode(next);
    if (next === 'file') {
      void router.replace(
        { pathname: `/dashboard/${repoId}/impact`, query: { file: filePath.trim() } },
        undefined,
        { shallow: true }
      );
    } else if (next === 'pull') {
      void router.replace(
        { pathname: `/dashboard/${repoId}/impact`, query: { pull: pullNumber.trim() } },
        undefined,
        { shallow: true }
      );
    } else {
      void router.replace(
        { pathname: `/dashboard/${repoId}/impact`, query: { symbol: symbolName.trim() } },
        undefined,
        { shallow: true }
      );
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoId) return;
    if (mode === 'file') {
      void router.replace(
        { pathname: `/dashboard/${repoId}/impact`, query: { file: filePath.trim() } },
        undefined,
        { shallow: true }
      );
      void analyzeFile(filePath.trim());
      return;
    }
    if (mode === 'pull') {
      void router.replace(
        { pathname: `/dashboard/${repoId}/impact`, query: { pull: pullNumber.trim() } },
        undefined,
        { shallow: true }
      );
      void analyzePull(pullNumber.trim());
      return;
    }
    void router.replace(
      { pathname: `/dashboard/${repoId}/impact`, query: { symbol: symbolName.trim() } },
      undefined,
      { shallow: true }
    );
    void analyzeSymbol(symbolName.trim());
  }

  const base = repoId ? `/dashboard/${repoId}` : '';
  const result =
    mode === 'file' ? fileResult : mode === 'pull' ? pullResult : symbolResult;

  return (
    <DashboardLayout activeNav="impact">
      <div className="canvas-inner ui-impact-page">
        <div className="page-title-block">
          <h1>Impact</h1>
          <p>
            What breaks if you change a module or merge a PR? Deterministic graph traversal plus
            test and history signals.
          </p>
        </div>

        {repoError ? <ErrorBanner>{repoError}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}

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
                placeholder="api/src/services/PaymentService.ts"
                spellCheck={false}
              />
            ) : mode === 'symbol' ? (
              <input
                id="impact-input"
                className="ui-input"
                value={symbolName}
                onChange={(event) => setSymbolName(event.target.value)}
                placeholder="PaymentService"
                spellCheck={false}
              />
            ) : (
              <input
                id="impact-input"
                className="ui-input"
                value={pullNumber}
                onChange={(event) => setPullNumber(event.target.value)}
                placeholder="42"
                inputMode="numeric"
              />
            )}
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Analyzing…' : 'Analyze impact'}
            </Button>
          </div>
        </form>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {repoLoading && !result ? <p className="empty-state">Loading repository…</p> : null}

        {fileResult && mode === 'file' && !loading ? (
          <FileImpactView result={fileResult} base={base} />
        ) : null}

        {symbolResult && mode === 'symbol' && !loading ? (
          <SymbolImpactView result={symbolResult} base={base} />
        ) : null}

        {pullResult && mode === 'pull' && !loading ? (
          <PullImpactView result={pullResult} base={base} />
        ) : null}

        {loading ? (
          <EmptyState
            icon={Crosshair}
            title="Analyzing impact…"
            description="Traversing the dependency graph."
          />
        ) : null}

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
                ? 'Try api/src/services/PaymentService.ts in demo mode.'
                : mode === 'symbol'
                  ? 'Try PaymentService in demo mode.'
                  : 'Try pull 42 in demo mode.'
            }
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function FileImpactView({ result, base }: { result: FileImpactAnalysis; base: string }) {
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
          target={result.target.filePath}
          directDependents={result.directDependents}
          transitiveDependents={result.transitiveDependents}
          outboundImports={result.outboundImports}
          baseHref={base}
        />
        {base ? (
          <p className="ui-impact-blast__link">
            <Link
              href={`${base}/architecture?file=${encodeURIComponent(result.target.filePath)}&blast=1`}
            >
              Open in dependency graph →
            </Link>
          </p>
        ) : null}
      </BentoPanel>
      <ImpactLists
        base={base}
        risk={result.risk}
        directDependents={result.directDependents}
        transitiveDependents={result.transitiveDependents}
        outboundImports={result.outboundImports}
        checklist={result.checklist}
        tests={result.relevantTests}
      />
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
              Score {result.hotspot.score.toFixed(0)} · {result.hotspot.changeCount} recent changes
            </p>
            <Link className="ui-diagram__action" href={`${base}/hotspots`}>
              View topography
            </Link>
          </div>
        </BentoPanel>
      ) : null}
    </>
  );
}

function SymbolImpactView({ result, base }: { result: SymbolImpactAnalysis; base: string }) {
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
        />
        {base ? (
          <p className="ui-impact-blast__link">
            <Link href={`${base}/impact?file=${encodeURIComponent(result.target.filePath)}`}>
              Open containing file impact →
            </Link>
          </p>
        ) : null}
      </BentoPanel>
      <ImpactLists
        base={base}
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

function PullImpactView({ result, base }: { result: PullImpactAnalysis; base: string }) {
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
              <Link href={`${base}/impact?file=${encodeURIComponent(file.filePath)}`}>
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
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports?: string[];
  checklist: string[];
  tests: FileImpactAnalysis['relevantTests'];
}) {
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
                      <Link href={`${props.base}/impact?file=${encodeURIComponent(mod)}`}>{mod}</Link>
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
                      <Link href={`${props.base}/impact?file=${encodeURIComponent(mod)}`}>{mod}</Link>
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
