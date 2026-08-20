import type { Icon } from '@phosphor-icons/react';
import {
  BookOpen,
  Crosshair,
  Flame,
  Gear,
  GitPullRequest,
  Graph,
  Lightning,
  MagnifyingGlass,
  Plugs,
  SquaresFour,
  Terminal
} from '@phosphor-icons/react';
import type { NavKey } from './shellChrome';

export type NavItemDef = {
  key: NavKey;
  href: string;
  label: string;
  icon: Icon;
  /** Absolute path (e.g. /docs) instead of dashboard-relative href. */
  absolute?: boolean;
};

export type NavGroupDef = {
  id: string;
  label: string;
  items: NavItemDef[];
};

/** Phase 2 IA — grouped navigation over existing routes. */
export const NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'home',
    label: '',
    items: [{ key: 'overview', href: '', label: 'Overview', icon: SquaresFour }]
  },
  {
    id: 'understand',
    label: 'Understand',
    items: [
      { key: 'architecture', href: '/architecture', label: 'Dependency Graph', icon: Graph },
      { key: 'hotspots', href: '/hotspots', label: 'Topography', icon: Flame },
      { key: 'search', href: '/search', label: 'Code Search', icon: MagnifyingGlass }
    ]
  },
  {
    id: 'investigate',
    label: 'Investigate',
    items: [
      { key: 'impact', href: '/impact', label: 'Impact Analysis', icon: Crosshair },
      { key: 'ask', href: '/ask', label: 'Ask RepoPilot', icon: Lightning }
    ]
  },
  {
    id: 'change',
    label: 'Change',
    items: [{ key: 'pulls', href: '/pulls', label: 'Pull Requests', icon: GitPullRequest }]
  },
  {
    id: 'integrate',
    label: 'Integrate',
    items: [{ key: 'mcp', href: '/mcp', label: 'Cursor / MCP', icon: Plugs }]
  },
  {
    id: 'system',
    label: 'System',
    items: [{ key: 'settings', href: '/settings', label: 'Settings', icon: Gear }]
  }
];

export type CommandDef = {
  id: string;
  label: string;
  hint?: string;
  /** Path relative to /dashboard/:repoId, or absolute if starts with /. */
  path: string;
  keywords?: string[];
};

export function dashboardCommands(repoId: string): CommandDef[] {
  const base = `/dashboard/${repoId}`;
  return [
    { id: 'overview', label: 'Open overview', path: base, keywords: ['home', 'dashboard'] },
    {
      id: 'architecture',
      label: 'Go to dependency graph',
      path: `${base}/architecture`,
      keywords: ['architecture', 'graph', 'modules']
    },
    {
      id: 'topography',
      label: 'Open topography / hotspots',
      path: `${base}/hotspots`,
      keywords: ['churn', 'risk', 'hotspot', 'topo']
    },
    {
      id: 'search',
      label: 'Search code',
      path: `${base}/search`,
      keywords: ['find', 'symbol', 'file']
    },
    {
      id: 'impact',
      label: 'Analyze impact',
      path: `${base}/impact`,
      keywords: ['blast', 'dependents', 'risk']
    },
    {
      id: 'ask',
      label: 'Ask RepoPilot',
      path: `${base}/ask`,
      keywords: ['ai', 'question', 'chat']
    },
    {
      id: 'pulls',
      label: 'Open pull requests',
      path: `${base}/pulls`,
      keywords: ['pr', 'review']
    },
    {
      id: 'mcp',
      label: 'Copy MCP / Cursor setup',
      path: `${base}/mcp`,
      keywords: ['cursor', 'claude', 'agent', 'context']
    },
    {
      id: 'settings',
      label: 'Open settings',
      path: `${base}/settings`,
      keywords: ['index', 'repo']
    },
    {
      id: 'docs',
      label: 'Open documentation',
      path: '/docs',
      keywords: ['help', 'guide'],
      hint: 'Docs'
    },
    {
      id: 'repos',
      label: 'Switch repository',
      path: '/repos',
      keywords: ['open', 'change repo'],
      hint: 'Repos'
    }
  ];
}

export function filterCommands(commands: CommandDef[], query: string): CommandDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((cmd) => {
    const hay = `${cmd.label} ${cmd.hint ?? ''} ${(cmd.keywords ?? []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}

/** Icons for palette rows (optional visual). */
export const COMMAND_ICONS: Record<string, Icon> = {
  overview: SquaresFour,
  architecture: Graph,
  topography: Flame,
  search: MagnifyingGlass,
  impact: Crosshair,
  ask: Lightning,
  pulls: GitPullRequest,
  mcp: Terminal,
  settings: Gear,
  docs: BookOpen,
  repos: SquaresFour
};
