import { describe, expect, it } from 'vitest';
import { repoApiPath, repositoryProxySubpath } from './serverApi';

describe('repositoryProxySubpath', () => {
  it('reads catch-all segments from the pathname', () => {
    expect(repositoryProxySubpath('/api/repositories/r1/wiki', 'r1')).toBe('wiki');
    expect(
      repositoryProxySubpath('/api/repositories/r1/graph/path?op=cycles', 'r1')
    ).toBe('graph/path');
  });

  it('ignores a ?path= query that would collide with [...path]', () => {
    expect(
      repositoryProxySubpath(
        '/api/repositories/r1/wiki?path=docs%2FAI_PROVIDERS.md',
        'r1'
      )
    ).toBe('wiki');
    expect(
      repositoryProxySubpath(
        '/api/repositories/r1/ownership?path=src%2Fapp.ts&revisionSha=abc',
        'r1'
      )
    ).toBe('ownership');
  });

  it('builds client BFF paths that include wiki file queries', () => {
    expect(repoApiPath('r1', 'wiki?path=docs%2Fx.md')).toBe(
      '/api/repositories/r1/wiki?path=docs%2Fx.md'
    );
  });
});
