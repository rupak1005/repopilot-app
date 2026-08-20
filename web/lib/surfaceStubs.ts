export type StubRelatedLink = {
  id: string;
  label: string;
  description: string;
  /** Path under `/dashboard/:repoId`. */
  path: string;
};

export type SurfaceStub = {
  id: 'planning' | 'wiki';
  title: string;
  lede: string;
  statusLabel: string;
  roadmap: string[];
  related: StubRelatedLink[];
};

export const SURFACE_STUBS: Record<SurfaceStub['id'], SurfaceStub> = {
  planning: {
    id: 'planning',
    title: 'Planning',
    lede: 'Turn impact and hotspots into change plans before you open a PR.',
    statusLabel: 'Foundation · hotspot candidates',
    roadmap: [
      'Attach candidate tests and reviewers from the index',
      'Persist named change briefs across sessions',
      'Hand off a plan into a PR review with the same evidence trail'
    ],
    related: [
      {
        id: 'impact',
        label: 'Impact analysis',
        description: 'See what breaks if a file or symbol changes.',
        path: '/impact'
      },
      {
        id: 'topography',
        label: 'Topography',
        description: 'Find high-churn modules that need a plan first.',
        path: '/hotspots'
      },
      {
        id: 'pulls',
        label: 'Pull requests',
        description: 'Review grounded findings on open changes.',
        path: '/pulls'
      }
    ]
  },
  wiki: {
    id: 'wiki',
    title: 'Wiki',
    lede: 'Living notes for this repository — ADRs, ownership, and how the system fits together.',
    statusLabel: 'Foundation · indexed markdown',
    roadmap: [
      'Link wiki pages to modules, owners, and Ask citations',
      'Ownership / CODEOWNERS overlays on wiki pages',
      'Search within wiki bodies'
    ],
    related: [
      {
        id: 'ask',
        label: 'Ask RepoPilot',
        description: 'Grounded Q&A over indexed files.',
        path: '/ask'
      },
      {
        id: 'graph',
        label: 'Dependency graph',
        description: 'Explore real import edges alongside docs.',
        path: '/architecture'
      },
      {
        id: 'docs',
        label: 'Product docs',
        description: 'RepoPilot product documentation (site-wide).',
        path: '/docs'
      }
    ]
  }
};

export function stubHref(repoId: string, path: string): string {
  if (path.startsWith('/')) {
    if (path.startsWith('/docs') || path.startsWith('/repos')) return path;
    return `/dashboard/${repoId}${path}`;
  }
  return `/dashboard/${repoId}/${path}`;
}
