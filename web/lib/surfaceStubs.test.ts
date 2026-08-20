import { describe, expect, it } from 'vitest';
import { SURFACE_STUBS, stubHref } from './surfaceStubs';

describe('surfaceStubs', () => {
  it('defines planning and wiki stubs with related links', () => {
    expect(SURFACE_STUBS.planning.related.length).toBeGreaterThan(0);
    expect(SURFACE_STUBS.wiki.title).toBe('Wiki');
    expect(SURFACE_STUBS.planning.roadmap[0]?.toLowerCase()).toContain('impact');
  });

  it('builds dashboard and absolute stub hrefs', () => {
    expect(stubHref('r1', '/impact')).toBe('/dashboard/r1/impact');
    expect(stubHref('r1', '/docs')).toBe('/docs');
  });
});
