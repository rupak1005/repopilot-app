/** Every public page route covered by Playwright e2e. */
export const PUBLIC_PAGES = [
  { path: '/', heading: /Understand your repository/i },
  { path: '/browse', heading: /Browse public repositories/i },
  { path: '/login', heading: /Sign in for private repos/i },
  { path: '/mcp', heading: /Connect Cursor \/ MCP/i }
] as const;

/** Every dashboard nav route covered after opening demo mode. */
export const DASHBOARD_PAGES = [
  { nav: 'Overview', path: '', expect: /Ask a question|Total Reviews|pulse/i },
  { nav: 'Dependency Graph', path: '/architecture', expect: /See how your codebase fits together/i },
  { nav: 'Topography', path: '/hotspots', expect: /Topography|Hotspot/i },
  { nav: 'Code Search', path: '/search', expect: /Search/i },
  { nav: 'Wiki', path: '/wiki', expect: /Wiki|coming soon/i },
  { nav: 'Impact Analysis', path: '/impact', expect: /Impact/i },
  { nav: 'Ask RepoPilot', path: '/ask', expect: /Ask RepoPilot/i },
  { nav: 'History', path: '/history', expect: /History/i },
  { nav: 'Planning', path: '/planning', expect: /Planning|coming soon/i },
  { nav: 'Pull Requests', path: '/pulls', expect: /Pull Requests/i },
  { nav: 'Findings', path: '/findings', expect: /Findings/i },
  { nav: 'Settings', path: '/settings', expect: /Settings/i }
] as const;

/** Demo chip on landing — must match EXAMPLE_REPOS label + slug. */
export const DEMO_CHIP_LABEL = 'RepoPilot';
export const DEMO_REPO_SLUG = 'rupak1005/repopilot';
