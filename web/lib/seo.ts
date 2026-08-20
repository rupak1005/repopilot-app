import { DOCS_NAV } from './docsNav';

export const SITE_NAME = 'RepoPilot';

export const DEFAULT_DESCRIPTION =
  'Index a GitHub repository for real dependency graphs, impact analysis, hotspots, grounded Ask, and evidence-backed PR review.';

export function publicAppOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  const origin = publicAppOrigin();
  if (!path || path === '/') return origin;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized.replace(/\/+$/, '')}`;
}

export const PUBLIC_SITEMAP_PATHS: string[] = [
  '/',
  '/browse',
  '/mcp',
  ...DOCS_NAV.map((item) => item.href)
];

export function siteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: DEFAULT_DESCRIPTION,
    url: publicAppOrigin(),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sitemapXml(): string {
  const body = PUBLIC_SITEMAP_PATHS.map(
    (path) => `  <url>\n    <loc>${escapeXml(absoluteUrl(path))}</loc>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /dashboard',
    'Disallow: /login',
    'Disallow: /repos',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    ''
  ].join('\n');
}
