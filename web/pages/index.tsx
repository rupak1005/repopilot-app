import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, BracketsCurly, Check, GithubLogo, GitBranch, MagnifyingGlass, Sparkle, TreeStructure } from '@phosphor-icons/react';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';
import { parseGithubRepoUrl } from '@repopilot/common';
import { EXAMPLE_REPOS, githubUrl } from '../lib/exampleRepos';
import { GITHUB_SIGN_IN_URL } from '../lib/auth';
import { isDemoMode } from '../lib/demoMode';
import { useIndexProgressUi } from '../lib/indexProgressUi';
import { apiUnreachableMessage, parseJsonResponse } from '../lib/parseJsonResponse';
import { DEFAULT_DESCRIPTION, siteJsonLd } from '../lib/seo';
import { track } from '../lib/analytics';

type Stage = 'Connecting to GitHub' | 'Reading repository' | 'Building code graph' | 'Preparing evidence';
const STAGES: Stage[] = ['Connecting to GitHub', 'Reading repository', 'Building code graph', 'Preparing evidence'];

function RepoMark({ size = 26 }: { size?: number }) {
  return <span className="repo-mark" style={{ width: size, height: size }} aria-hidden><svg viewBox="0 0 32 32" width={size * 0.72} height={size * 0.72} fill="none"><path d="M8 7v18M8 16h7M15 16V9h9M15 16v8h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /><circle cx="8" cy="7" r="2.5" fill="currentColor" /><circle cx="15" cy="16" r="2.5" fill="currentColor" /><circle cx="24" cy="9" r="2.5" fill="currentColor" /><circle cx="24" cy="24" r="2.5" fill="currentColor" /></svg></span>;
}

function EvidenceCard({ title, path, meta, tone = 'plain' }: { title: string; path: string; meta: string; tone?: 'plain' | 'accent' | 'warn' }) {
  return <article className={`evidence-card evidence-card--${tone}`}><div className="evidence-card__top"><span className="evidence-card__dot" /><span>{title}</span><span className="evidence-card__more">···</span></div><code>{path}</code><strong>{meta}</strong></article>;
}

function ProductPreview({ focused, activeNode, setActiveNode }: { focused: boolean; activeNode: string; setActiveNode: (node: string) => void }) {
  const isPayment = activeNode === 'PaymentService';
  return <div className={`product-preview${focused ? ' product-preview--focused' : ''}`}>
    <div className="product-preview__chrome"><span className="product-preview__window-dot product-preview__window-dot--violet" /><span className="product-preview__window-dot" /><span className="product-preview__window-dot" /><span className="product-preview__repo"><GithubLogo size={14} weight="fill" /> repopilot / web</span><span className="product-preview__status"><span /> indexed 2m ago</span></div>
    <div className="product-preview__body"><div className="product-preview__rail"><span className="rail-active"><TreeStructure size={16} /> Architecture</span><span><MagnifyingGlass size={16} /> Search</span><span><Sparkle size={16} /> Ask</span><span><GitBranch size={16} /> Impact</span></div>
      <div className="product-preview__canvas"><div className="canvas-label">SYSTEM MAP <span>· 48 modules · 126 edges</span></div>
        <svg className="graph-lines" viewBox="0 0 620 370" preserveAspectRatio="none" aria-hidden><path className={activeNode === 'Frontend' ? 'is-hot' : ''} d="M310 92V145M310 180V228M310 264L170 313M310 264L470 313M170 313H90M470 313H550" /><path className={isPayment ? 'is-hot' : ''} d="M380 180L510 218M380 180L520 120" /><path d="M240 180L130 218M130 218L90 313" /></svg>
        <button className={`graph-node graph-node--root${activeNode === 'Frontend' ? ' is-selected' : ''}`} onClick={() => setActiveNode('Frontend')}><span className="node-kicker">app</span>Frontend</button>
        <button className={`graph-node graph-node--auth${activeNode === 'AuthService' ? ' is-selected' : ''}`} onClick={() => setActiveNode('AuthService')}><span className="node-kicker">service</span>AuthService</button>
        <button className={`graph-node graph-node--payment${isPayment ? ' is-selected' : ''}`} onClick={() => setActiveNode('PaymentService')}><span className="node-kicker">service</span>PaymentService</button>
        <button className="graph-node graph-node--orders" onClick={() => setActiveNode('OrderService')}><span className="node-kicker">service</span>OrderService</button><span className="graph-node graph-node--db"><span className="node-kicker">data</span>PostgreSQL</span><span className="graph-node graph-node--worker"><span className="node-kicker">worker</span>QueueWorker</span><span className="graph-node graph-node--test"><span className="node-kicker">tests</span>integration</span>
        <EvidenceCard title={isPayment ? 'PaymentService' : 'Authentication'} path={isPayment ? 'src/payment/service.ts' : 'src/auth/service.ts'} meta={isPayment ? 'HIGH IMPACT · 12 dependents' : '12 dependents'} tone={isPayment ? 'warn' : 'accent'} />
        <div className="ai-insight"><div><Sparkle size={14} weight="fill" /> AI INSIGHT</div><p>{isPayment ? 'Checkout depends on PaymentService through OrderService.' : 'AuthService gates the request path before OrderService.'}</p><code>{isPayment ? 'payment.ts:84–109' : 'auth.ts:41–63'}</code></div><div className="canvas-coordinates">x 048 · y 126 <span>REVISION 8d2c1a</span></div>
      </div>
    </div>
  </div>;
}

function SectionHeading({ title, copy }: { title: string; copy: string }) {
  return <div className="landing-section-heading"><h2>{title}</h2><p>{copy}</p></div>;
}

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>(STAGES[0]);
  const [focused, setFocused] = useState(false);
  const [activeNode, setActiveNode] = useState('AuthService');
  const { startIndexProgress } = useIndexProgressUi();

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setStage((current) => STAGES[(STAGES.indexOf(current) + 1) % STAGES.length]), 950);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function openRepo(input: string) {
    setLoading(true); setStage(STAGES[0]); setError(null); track({ name: 'repository_open_started', properties: { source: 'landing' } });
    try {
      if (!parseGithubRepoUrl(input)) throw new Error('Paste a public GitHub URL or owner/repo slug.');
      const response = await fetch('/api/public/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: input }) });
      const data = await parseJsonResponse<{ repositoryId?: string; fullName?: string; indexing?: boolean; error?: string }>(response);
      if (!data) throw new Error(apiUnreachableMessage());
      if (!response.ok || !data.repositoryId) throw new Error(data.error ?? 'Could not open repository');
      track({ name: 'repository_open_succeeded', properties: { demo: Boolean(isDemoMode()) } });
      if (data.indexing && !isDemoMode()) startIndexProgress({ repoId: data.repositoryId, fullName: data.fullName ?? input, onReady: () => void router.push(`/dashboard/${data.repositoryId}`) });
      void router.push(`/dashboard/${data.repositoryId}`);
    } catch (err) {
      track({ name: 'repository_open_failed' }); setError(err instanceof Error ? err.message : 'Something went wrong'); setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) { event.preventDefault(); void openRepo(url); }

  return <PublicPageLayout active="home" pageClassName="landing-page" mainClassName="landing-page__main" shellClassName="landing-shell" decorVariant="none" seo={{ title: 'Repository intelligence', description: DEFAULT_DESCRIPTION, path: '/', jsonLd: siteJsonLd() }}>
    <section className="landing-hero" aria-labelledby="landing-title"><div className="landing-hero__copy"><p className="landing-kicker"><span className="kicker-line" /> REPOSITORY INTELLIGENCE</p><h1 id="landing-title">See how your<br /><em>codebase</em> works.</h1><p className="landing-lede">RepoPilot turns any GitHub repository into an evidence-backed map of architecture, dependencies, history, and AI context.</p>
      <form id="repository-analyzer" className={`repo-input${focused ? ' repo-input--focused' : ''}`} onSubmit={handleSubmit}><label htmlFor="github-url"><GithubLogo size={20} weight="fill" /><span className="visually-hidden">GitHub repository</span></label><input id="github-url" value={url} onChange={(event) => setUrl(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="github.com/owner/repository" spellCheck={false} autoComplete="url" /><button type="submit" disabled={loading || !url.trim()} title={loading ? stage : undefined}>{loading ? <><span className="input-loader" /><span className="repo-input__loading-label">{stage.replace(' to GitHub', '…').replace(' repository', '…').replace(' code graph', '…').replace(' evidence', '…')}</span></> : <>Analyze <ArrowRight size={17} weight="bold" /></>}</button></form>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}<div className="repo-input__hint"><span>⌘ ↵</span> or open directly <code>repopilot.software/owner/repo</code></div><div className="landing-examples"><span>Try a repository</span>{EXAMPLE_REPOS.slice(0, 3).map((repo) => <button key={repo.slug} type="button" onClick={() => { setUrl(githubUrl(repo.slug)); void openRepo(repo.slug); }}>{repo.label}</button>)}</div>
    </div><div className="landing-hero__visual"><ProductPreview focused={focused} activeNode={activeNode} setActiveNode={setActiveNode} /><p className="visual-caption"><span><span className="pulse-dot" /> live system activity</span><span>hover a node to trace dependencies</span></p></div></section>
    <section className="signal-row" aria-label="RepoPilot product properties"><span>AST-backed</span><span>Evidence-backed</span><span>Revision-aware</span><span>Git-native</span><span>MCP-ready</span></section>
    <section className="story-section story-section--pipeline"><SectionHeading title="From repository to understanding." copy="One source of truth, turned into a navigable system." /><div className="pipeline"><div><span>01</span><GitBranch size={22} /><strong>GitHub</strong><small>source repository</small></div><ArrowRight /><div><span>02</span><BracketsCurly size={22} /><strong>Ingestion</strong><small>Tree-sitter + history</small></div><ArrowRight /><div className="pipeline__active"><span>03</span><TreeStructure size={22} /><strong>Dependency graph</strong><small>modules + symbols</small></div><ArrowRight /><div><span>04</span><Sparkle size={22} /><strong>Evidence</strong><small>citations + answers</small></div></div></section>
    <section className="story-section architecture-story"><SectionHeading title="See the architecture." copy="The shape of a system is easier to change when it is visible." /><div className="architecture-board"><div className="architecture-board__labels"><span>FRONTEND</span><span>BACKEND</span><span>DATA + WORKERS</span></div><svg viewBox="0 0 1100 330" preserveAspectRatio="none" aria-hidden><path d="M170 100H350V165H520M520 165H730V90H920M520 165V255H920M350 100V255H170" /><path d="M730 90V255" /></svg>{[['web', 'Frontend', 11, 22], ['api', 'API server', 29, 40], ['auth', 'AuthService', 46, 40], ['db', 'PostgreSQL', 79, 22], ['worker', 'QueueWorker', 79, 72], ['mcp', 'MCP tools', 46, 72]].map(([id, label, left, top]) => <button key={id} className={`arch-node arch-node--${id}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => setActiveNode(String(label))}><span>{id}</span>{label}</button>)}</div></section>
    <section className="story-section ask-story"><div className="story-split"><SectionHeading title="Ask questions that have evidence." copy="Answers stay connected to the code that supports them." /><div className="ask-preview"><div className="ask-preview__question"><span className="ask-avatar"><Sparkle size={14} weight="fill" /></span>How does authentication work?</div><div className="ask-preview__answer"><div className="answer-label"><Check size={14} weight="bold" /> grounded answer</div><p>Requests enter through <code>AuthMiddleware</code>, which validates the session token before handing the user context to <code>OrderService</code>.</p><div className="citation-row"><span>3 files</span><code>auth.ts:41–63</code><code>middleware.ts:18–32</code></div></div></div></div></section>
    <section className="story-section impact-story"><div className="impact-copy"><p className="section-index">04 / CHANGE SURFACE</p><h2>Know what<br /><em>will break.</em></h2><p>Trace direct and indirect dependents before a small change becomes a production surprise.</p><Link href="/docs/architecture">Explore impact analysis <ArrowRight size={16} /></Link></div><div className="impact-panel"><div className="impact-panel__header"><span>IMPACT ANALYSIS</span><span className="risk-high">HIGH RISK</span></div><h3>PaymentService</h3><code>src/payment/service.ts</code><div className="impact-metrics"><div><strong>12</strong><span>direct dependents</span></div><div><strong>41</strong><span>indirect dependents</span></div><div><strong>8</strong><span>related tests</span></div></div><div className="impact-tree"><span className="impact-tree__root">PaymentService</span><span>↳ OrderService</span><span>↳ CheckoutController</span><span>↳ 8 integration tests</span></div></div></section>
    <section className="story-section tools-story"><SectionHeading title="The repository is the interface." copy="Use the same intelligence from the surfaces where engineering work already happens." /><div className="tool-strip"><div><span className="tool-icon">⌘</span><strong>Ingest</strong><p>Token-aware context<br />for any agent.</p><code>32,480 tokens</code></div><div><span className="tool-icon">↗</span><strong>Reverse</strong><p>Repository → spec<br />→ implementation prompt.</p><code>evidence boundaries</code></div><div><span className="tool-icon">◌</span><strong>History</strong><p>See how the system<br />changed over time.</p><code>revision-aware</code></div><div><span className="tool-icon">&lt;/&gt;</span><strong>Everywhere</strong><p>GitHub · Cursor · Claude<br />Codex · MCP · CLI</p><code>built for handoff</code></div></div></section>
    <section className="landing-end"><RepoMark size={34} /><h2>Start with the code.</h2><p>Paste a public repository and let the map take shape.</p><button type="button" onClick={() => document.getElementById('github-url')?.focus()}>Analyze a repository <ArrowRight size={17} /></button></section>
    <footer className="landing-footer"><span>© RepoPilot</span><span className="footer-links"><Link href="/docs">Docs</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href={GITHUB_SIGN_IN_URL}>GitHub</Link></span><span>v0.1 · built for understanding</span></footer>
  </PublicPageLayout>;
}
