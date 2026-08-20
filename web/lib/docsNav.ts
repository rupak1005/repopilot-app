export type DocSlug =
  | 'introduction'
  | 'getting-started'
  | 'development'
  | 'architecture'
  | 'design-system'
  | 'api-reference'
  | 'mcp';

export type DocNavItem = {
  slug: DocSlug;
  href: string;
  title: string;
  summary: string;
};

export const DOCS_NAV: DocNavItem[] = [
  {
    slug: 'introduction',
    href: '/docs',
    title: 'Introduction',
    summary: 'What RepoPilot is and how the pieces fit together.'
  },
  {
    slug: 'getting-started',
    href: '/docs/getting-started',
    title: 'Getting started',
    summary: 'Analyze a repo, use the dashboard, and connect GitHub.'
  },
  {
    slug: 'development',
    href: '/docs/development',
    title: 'Development',
    summary: 'Local setup, build commands, env vars, and indexing scripts.'
  },
  {
    slug: 'architecture',
    href: '/docs/architecture',
    title: 'Architecture',
    summary: 'Monorepo layout, indexing pipeline, and technology choices.'
  },
  {
    slug: 'design-system',
    href: '/docs/design-system',
    title: 'Design system',
    summary: 'Neo-brutalist UI tokens, layout layers, and component patterns.'
  },
  {
    slug: 'api-reference',
    href: '/docs/api-reference',
    title: 'API reference',
    summary: 'REST endpoints exposed by the Fastify API service.'
  },
  {
    slug: 'mcp',
    href: '/docs/mcp',
    title: 'MCP for agents',
    summary: 'Connect RepoPilot tools to Cursor, Claude Desktop, or other MCP clients.'
  }
];

export function docHref(slug: DocSlug): string {
  return slug === 'introduction' ? '/docs' : `/docs/${slug}`;
}
