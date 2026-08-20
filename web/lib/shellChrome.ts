import type { RepositoryIndexStatus } from './indexStatus';
import { indexStatusLabel } from './indexStatus';

export type NavKey =
  | 'overview'
  | 'search'
  | 'ask'
  | 'pulls'
  | 'hotspots'
  | 'architecture'
  | 'impact'
  | 'settings'
  | 'mcp';

export type HelpTip = {
  title: string;
  body: string;
  docHref: string;
  docLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const HELP_BY_NAV: Record<NavKey, HelpTip> = {
  overview: {
    title: 'Start from the pulse',
    body: 'Overview is your repo’s status board — index health, then jump into graph, ask, or hotspots.',
    docHref: '/docs/getting-started',
    docLabel: 'Getting started',
    secondaryHref: '/docs/architecture',
    secondaryLabel: 'How indexing works'
  },
  search: {
    title: 'Search symbols, not vibes',
    body: 'Query files and symbols from the indexed graph. Prefer precise names over vague keywords.',
    docHref: '/docs/getting-started',
    docLabel: 'Using search',
    secondaryHref: '/docs/api-reference',
    secondaryLabel: 'Search API'
  },
  ask: {
    title: 'Ask with citations',
    body: 'Answers pull from retrieved snippets and must cite file + lines. Treat code as untrusted data.',
    docHref: '/docs/getting-started',
    docLabel: 'Ask walkthrough',
    secondaryHref: '/docs/mcp',
    secondaryLabel: 'Use Ask in Cursor (MCP)'
  },
  pulls: {
    title: 'Review with evidence',
    body: 'PR findings are grounded in the indexed graph and history — open a PR to inspect severity + files.',
    docHref: '/docs/getting-started',
    docLabel: 'PR review',
    secondaryHref: '/docs/api-reference',
    secondaryLabel: 'Review endpoints'
  },
  hotspots: {
    title: 'Churn meets risk',
    body: 'Hotspots rank files by change volume, dependents, and findings so you know where to look first.',
    docHref: '/docs/getting-started',
    docLabel: 'Hotspots',
    secondaryHref: '/docs/architecture',
    secondaryLabel: 'Pipeline stages'
  },
  architecture: {
    title: 'Real edges, not sketches',
    body: 'The diagram is import/AST dependency edges from your index — click a node to inspect neighbors.',
    docHref: '/docs/architecture',
    docLabel: 'Architecture docs',
    secondaryHref: '/docs/design-system',
    secondaryLabel: 'Canvas design notes'
  },
  impact: {
    title: 'Blast radius before merge',
    body: 'Pick a symbol or file to see dependents and risk. Untested blast radius ranks higher.',
    docHref: '/docs/getting-started',
    docLabel: 'Impact analysis',
    secondaryHref: '/docs/architecture',
    secondaryLabel: 'Graph model'
  },
  settings: {
    title: 'Repo + session controls',
    body: 'Confirm which GitHub repo is selected, re-index if the SHA looks stale, and manage MCP access.',
    docHref: '/docs/mcp',
    docLabel: 'MCP setup',
    secondaryHref: '/docs/development',
    secondaryLabel: 'Env & deploy'
  },
  mcp: {
    title: 'Agents on your graph',
    body: 'Point Cursor or Claude Desktop at RepoPilot MCP so Ask, impact, and search run against this repo’s index.',
    docHref: '/docs/mcp',
    docLabel: 'MCP setup',
    secondaryHref: '/docs/api-reference',
    secondaryLabel: 'API reference'
  }
};

export function helpTipForNav(nav: NavKey): HelpTip {
  return HELP_BY_NAV[nav];
}

export type ActivityKind = 'index' | 'suggest' | 'alert';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  body: string;
  href?: string;
  unread?: boolean;
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/** Build a small activity feed from live index status (no notification backend). */
export function buildActivityItems(args: {
  repoId: string;
  repoFullName: string;
  indexStatus: RepositoryIndexStatus | null;
  seenReadySha: string | null;
}): ActivityItem[] {
  const { repoId, repoFullName, indexStatus, seenReadySha } = args;
  const base = `/dashboard/${repoId}`;
  const shortName = repoFullName.split('/')[1] ?? repoFullName;
  const items: ActivityItem[] = [];

  if (!indexStatus || indexStatus.state === 'not_indexed') {
    items.push({
      id: 'index-missing',
      kind: 'alert',
      title: `${shortName} isn’t indexed yet`,
      body: 'Index once to unlock Ask, architecture, hotspots, and impact.',
      href: `${base}/settings`
    });
  } else if (indexStatus.state === 'indexing') {
    items.push({
      id: 'index-progress',
      kind: 'index',
      title: indexStatusLabel(indexStatus),
      body: `Stage: ${indexStatus.stage}. Keep this tab open — indexing runs on the API.`,
      href: base
    });
  } else if (indexStatus.state === 'failed') {
    items.push({
      id: 'index-failed',
      kind: 'alert',
      title: 'Index failed',
      body: indexStatus.job?.lastError?.slice(0, 160) || 'Check API logs and try re-indexing from Settings.',
      href: `${base}/settings`,
      unread: true
    });
  } else if (indexStatus.state === 'ready') {
    const sha = indexStatus.revisionSha ?? 'ready';
    const unread = Boolean(sha && sha !== seenReadySha);
    items.push({
      id: `index-ready-${sha}`,
      kind: 'index',
      title: `${shortName} is ready`,
      body: `${formatCount(indexStatus.fileCount)} files · ${formatCount(indexStatus.symbolCount)} symbols${
        indexStatus.revisionSha ? ` · ${indexStatus.revisionSha.slice(0, 7)}` : ''
      }`,
      href: base,
      unread
    });
    items.push({
      id: 'suggest-ask',
      kind: 'suggest',
      title: 'Try Ask with citations',
      body: 'Ask how auth works — answers must point at file + lines.',
      href: `${base}/ask`
    });
    items.push({
      id: 'suggest-graph',
      kind: 'suggest',
      title: 'Open the dependency graph',
      body: 'See real import edges instead of an AI sketch.',
      href: `${base}/architecture`
    });
  }

  return items;
}

export function activityUnreadCount(items: ActivityItem[]): number {
  return items.filter((item) => item.unread).length;
}

export function seenReadyStorageKey(repoId: string): string {
  return `rp.activity.seenReady.${repoId}`;
}
