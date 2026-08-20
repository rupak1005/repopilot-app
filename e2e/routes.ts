/** Every public page route covered by Playwright e2e. */
export const PUBLIC_PAGES = [
  { path: '/', heading: /Understand your repository/i },
  { path: '/browse', heading: /Browse public repositories/i },
  { path: '/login', heading: /Sign in for private repos/i },
  { path: '/mcp', heading: /Connect Cursor \/ MCP/i }
] as const;

/** Every dashboard nav route covered after opening demo mode. */
export const DASHBOARD_PAGES = [
  { nav: 'Overview', path: '', expect: /Ask a question|Total Reviews/i },
  { nav: 'Search', path: '/search', expect: /Search/i },
  { nav: 'Ask RepoPilot', path: '/ask', expect: /Ask RepoPilot/i },
  { nav: 'Pull Requests', path: '/pulls', expect: /Pull Requests/i },
  { nav: 'Hotspots', path: '/hotspots', expect: /Hotspots/i },
  { nav: 'Architecture', path: '/architecture', expect: /See how your codebase fits together/i },
  { nav: 'Impact', path: '/impact', expect: /Impact/i },
  { nav: 'Settings', path: '/settings', expect: /Settings/i }
] as const;

/** Demo chip on landing — must match EXAMPLE_REPOS label + slug. */
export const DEMO_CHIP_LABEL = 'RepoPilot';
export const DEMO_REPO_SLUG = 'rupak1005/repopilot';
