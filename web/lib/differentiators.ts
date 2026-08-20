export type DifferentiatorIcon =
  | 'graph'
  | 'impact'
  | 'hotspots'
  | 'ask'
  | 'reviews'
  | 'mcp';

export type Differentiator = {
  id: string;
  title: string;
  description: string;
  icon: DifferentiatorIcon;
  /** Dashboard path segment, e.g. `/impact` */
  path?: string;
};

/** RepoPilot capabilities GitDiagram-style tools do not offer — shared marketing copy. */
export const REPO_PILOT_DIFFERENTIATORS: Differentiator[] = [
  {
    id: 'real-graph',
    title: 'Real dependency graph',
    description: 'Built from import edges and AST analysis — not AI guesses.',
    icon: 'graph',
    path: '/architecture'
  },
  {
    id: 'impact',
    title: 'Impact analysis',
    description: 'See what breaks before you merge a change.',
    icon: 'impact',
    path: '/impact'
  },
  {
    id: 'hotspots',
    title: 'Code hotspots',
    description: 'Find where the team actually churns code.',
    icon: 'hotspots',
    path: '/hotspots'
  },
  {
    id: 'ask',
    title: 'Ask with citations',
    description: 'Questions answered with file-and-line evidence.',
    icon: 'ask',
    path: '/ask'
  },
  {
    id: 'reviews',
    title: 'PR review findings',
    description: 'Evidence-backed review signals, not vibes.',
    icon: 'reviews',
    path: '/pulls'
  },
  {
    id: 'mcp',
    title: 'MCP for agents',
    description: 'Connect IDE agents to search, impact, Ask, and context tools.',
    icon: 'mcp',
    path: '/mcp'
  }
];

export const DIFFERENTIATOR_TAGLINE =
  'GitDiagram shows a sketch. RepoPilot indexes your repo and keeps engineering intelligence behind every view.';
