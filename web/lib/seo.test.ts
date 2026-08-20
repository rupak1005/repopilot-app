import { afterEach, describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  PUBLIC_SITEMAP_PATHS,
  robotsTxt,
  sitemapXml,
  SITE_NAME
} from './seo';

describe('seo', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('builds absolute URLs from NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.repopilot.dev/';
    expect(absoluteUrl('/')).toBe('https://app.repopilot.dev');
    expect(absoluteUrl('/docs/mcp')).toBe('https://app.repopilot.dev/docs/mcp');
  });

  it('lists public marketing paths and keeps private areas out of robots', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example';
    expect(PUBLIC_SITEMAP_PATHS).toContain('/');
    expect(PUBLIC_SITEMAP_PATHS).toContain('/docs');
    expect(PUBLIC_SITEMAP_PATHS).not.toContain('/login');
    const robots = robotsTxt();
    expect(robots).toContain('Disallow: /dashboard');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://app.example/sitemap.xml');
    expect(sitemapXml()).toContain(`<loc>https://app.example/docs/mcp</loc>`);
    expect(SITE_NAME).toBe('RepoPilot');
  });
});
