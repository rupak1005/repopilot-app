import { describe, expect, it } from 'vitest';
import { githubModuleUrl, moduleSearchQuery, stripModuleAlias } from './modulePaths';

describe('modulePaths', () => {
  it('strips @/ aliases and builds a search leaf name', () => {
    expect(stripModuleAlias('@/components/providers/viewer-provider')).toBe(
      'components/providers/viewer-provider'
    );
    expect(moduleSearchQuery('@/components/providers/viewer-provider')).toBe('viewer-provider');
    expect(moduleSearchQuery('api/src/server.ts')).toBe('server');
  });

  it('uses blob URLs for real file paths and search for aliases', () => {
    expect(githubModuleUrl('ada/app', 'src/auth.ts', 'abc1234')).toBe(
      'https://github.com/ada/app/blob/abc1234/src/auth.ts'
    );
    const alias = githubModuleUrl('rupak1005/Socially', '@/components/providers/viewer-provider');
    expect(alias).toContain('github.com/rupak1005/Socially/search');
    expect(alias).toContain('type=code');
    expect(decodeURIComponent(alias)).toContain('viewer-provider');
  });
});
