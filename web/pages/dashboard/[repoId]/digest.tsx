import { useEffect, useState } from 'react';
import { DownloadSimple, Copy, FileText } from '@phosphor-icons/react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { PageLoading } from '../../../components/ui/Skeleton';
import { useDashboardContext, useNeedsIndexHint } from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { repoApiPath } from '../../../lib/repoApiPath';

type Digest = {
  repository: { owner: string; name: string };
  revisionSha: string;
  indexedAt: string;
  stats: {
    filesAnalyzed: number;
    directories: number;
    sourceFiles: number;
    extractedBytes: number;
    estimatedTokens: number;
  };
  tree: string;
  markdown: string;
};

const DEMO_DIGEST: Digest = {
  repository: { owner: 'repopilot', name: 'demo' },
  revisionSha: 'demo',
  indexedAt: new Date(0).toISOString(),
  stats: { filesAnalyzed: 42, directories: 11, sourceFiles: 31, extractedBytes: 128000, estimatedTokens: 32000 },
  tree: 'src/\n  app/\n    routes.ts\n  components/\n    dashboard.tsx\nREADME.md',
  markdown: '# Repository: repopilot/demo\n\nThis is a demo digest. Analyze a public repository to generate a real revision-aware digest.'
};

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DigestPage() {
  const dash = useDashboardContext();
  const repoId = dash?.repoId ?? null;
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const needsIndex = useNeedsIndexHint(repoId);

  useEffect(() => {
    if (!repoId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isDemoMode()) {
          setDigest(DEMO_DIGEST);
          return;
        }
        const response = await fetch(repoApiPath(repoId!, 'digest'));
        const payload = (await response.json().catch(() => null)) as (Digest & { error?: string }) | null;
        if (!response.ok || !payload?.markdown) throw new Error(payload?.error ?? 'Could not load repository digest.');
        if (!cancelled) setDigest(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load repository digest.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [repoId]);

  async function copyDigest() {
    if (!digest) return;
    await navigator.clipboard.writeText(digest.markdown);
  }

  return (
    <div className="canvas-inner ui-digest-page">
      <div className="page-title-block">
        <p className="label-caps">Prompt-ready ingestion</p>
        <h1>Repository digest</h1>
        <p>One bounded, revision-aware Markdown artifact for AI tools and human handoff.</p>
      </div>
      {needsIndex ? <p className="ui-digest-note">Index this repository to generate a digest from real source evidence.</p> : null}
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {loading ? <PageLoading label="Building digest…" /> : null}
      {!loading && !digest ? <EmptyState icon={FileText} title="Digest unavailable" description="This repository does not have an indexed revision yet." /> : null}
      {digest ? (
        <>
          <div className="ui-digest-actions">
            <Button variant="primary" icon={<Copy size={16} />} onClick={() => void copyDigest()}>Copy Markdown</Button>
            <Button variant="secondary" icon={<DownloadSimple size={16} />} onClick={() => download(`${digest.repository.name}-digest.md`, digest.markdown, 'text/markdown')}>Download Markdown</Button>
            <Button variant="ghost" onClick={() => download(`${digest.repository.name}-digest.json`, JSON.stringify(digest, null, 2), 'application/json')}>Download JSON</Button>
          </div>
          <div className="ui-digest-stats">
            <span><strong>{digest.stats.filesAnalyzed.toLocaleString()}</strong> files</span>
            <span><strong>{digest.stats.directories.toLocaleString()}</strong> directories</span>
            <span><strong>{digest.stats.sourceFiles.toLocaleString()}</strong> source files</span>
            <span><strong>{digest.stats.estimatedTokens.toLocaleString()}</strong> estimated tokens</span>
          </div>
          <BentoPanel title={`Revision ${digest.revisionSha.slice(0, 12)}`}>
            <div className="ui-digest-grid">
              <section>
                <h2>Directory structure</h2>
                <pre className="ui-digest-tree">{digest.tree}</pre>
              </section>
              <section>
                <h2>Markdown preview</h2>
                <pre className="ui-digest-preview">{digest.markdown}</pre>
              </section>
            </div>
          </BentoPanel>
        </>
      ) : null}
    </div>
  );
}
