import { useEffect, useState } from 'react';
import { Copy, Path } from '@phosphor-icons/react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { Button } from '../../../components/ui/Button';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { PageLoading } from '../../../components/ui/Skeleton';
import { useDashboardContext } from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { repoApiPath } from '../../../lib/repoApiPath';

type ReversePrompt = {
  revisionSha: string;
  mode: 'quick' | 'deep';
  prompt: string;
  evidence: { observed: string[]; inferred: string[]; unknown: string[] };
};

export default function ReversePage() {
  const dash = useDashboardContext();
  const repoId = dash?.repoId ?? null;
  const [mode, setMode] = useState<'quick' | 'deep'>('quick');
  const [result, setResult] = useState<ReversePrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isDemoMode()) {
          setResult({ revisionSha: 'demo', mode, prompt: '# Build prompt\n\nUse the indexed repository evidence to reconstruct the product.\n\nObserved: demo fixture.', evidence: { observed: ['Demo fixture'], inferred: [], unknown: ['Real source evidence is unavailable in demo mode.'] } });
          return;
        }
        const response = await fetch(repoApiPath(repoId!, `reverse?mode=${mode}`));
        const payload = (await response.json().catch(() => null)) as (ReversePrompt & { error?: string }) | null;
        if (!response.ok || !payload?.prompt) throw new Error(payload?.error ?? 'Could not generate reverse prompt.');
        if (!cancelled) setResult(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not generate reverse prompt.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [repoId, mode]);

  async function copyPrompt() {
    if (result) await navigator.clipboard.writeText(result.prompt);
  }

  return (
    <div className="canvas-inner ui-reverse-page">
      <div className="page-title-block">
        <p className="label-caps">Grounded generation</p>
        <h1>Reverse engineer</h1>
        <p>Turn the indexed repository into a build prompt with evidence boundaries you can inspect.</p>
      </div>
      <div className="ui-reverse-controls" role="group" aria-label="Reverse prompt mode">
        <Button variant={mode === 'quick' ? 'primary' : 'secondary'} onClick={() => setMode('quick')}>Quick reverse</Button>
        <Button variant={mode === 'deep' ? 'primary' : 'secondary'} onClick={() => setMode('deep')}>Deep reverse</Button>
        {result ? <Button variant="ghost" icon={<Copy size={16} />} onClick={() => void copyPrompt()}>Copy prompt</Button> : null}
      </div>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {loading ? <PageLoading label={`Generating ${mode} reverse…`} /> : null}
      {result ? (
        <>
          <div className="ui-reverse-evidence">
            <BentoPanel title="Observed"><ul>{result.evidence.observed.map((item) => <li key={item}>{item}</li>)}</ul></BentoPanel>
            <BentoPanel title="Inferred"><ul>{result.evidence.inferred.map((item) => <li key={item}>{item}</li>)}</ul></BentoPanel>
            <BentoPanel title="Unknown"><ul>{result.evidence.unknown.map((item) => <li key={item}>{item}</li>)}</ul></BentoPanel>
          </div>
          <BentoPanel title={`Build prompt · ${result.revisionSha.slice(0, 12)}`}>
            <pre className="ui-reverse-preview">{result.prompt}</pre>
          </BentoPanel>
        </>
      ) : null}
      {!loading && !result && !error ? <Path size={40} aria-hidden /> : null}
    </div>
  );
}
