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
    statusLabel: 'Stub · coming soon',
    roadmap: [
      'Draft change plans from Impact blast radius + Topography churn',
      'Attach candidate files, tests, and reviewers from the index',
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
    statusLabel: 'Stub · coming soon',
    roadmap: [
      'Index markdown / ADR docs alongside the dependency graph',
      'Link wiki pages to modules, owners, and Ask citations',
      'Keep wiki pages revision-aware with the same `?rev=` model'
    ],
    related: [
      {
        id: 'ask',
        label: 'Ask RepoPilot',
        description: 'Grounded Q&A over indexed files until wiki pages land.',
        path: '/ask'
      },
      {
        id: 'graph',
        label: 'Dependency graph',
        description: 'Explore real import edges while docs catch up.',
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
