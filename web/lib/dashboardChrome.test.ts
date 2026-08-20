import { describe, expect, it } from 'vitest';
import { resolveDashboardChrome } from './dashboardChrome';

describe('resolveDashboardChrome', () => {
  it('returns null outside the dashboard', () => {
    expect(resolveDashboardChrome('/')).toBeNull();
    expect(resolveDashboardChrome('/mcp')).toBeNull();
  });

  it('maps dashboard paths to nav chrome', () => {
    expect(resolveDashboardChrome('/dashboard/[repoId]')).toEqual({ activeNav: 'overview' });
    expect(resolveDashboardChrome('/dashboard/[repoId]/search')).toEqual({ activeNav: 'search' });
    expect(resolveDashboardChrome('/dashboard/[repoId]/ask')).toEqual({
      activeNav: 'ask',
      canvasClass: 'canvas--ask'
    });
    expect(resolveDashboardChrome('/dashboard/[repoId]/architecture')).toEqual({
      activeNav: 'architecture',
      canvasClass: 'canvas--diagram'
    });
    expect(resolveDashboardChrome('/dashboard/[repoId]/pulls/[number]')).toEqual({
      activeNav: 'pulls'
    });
  });
});
