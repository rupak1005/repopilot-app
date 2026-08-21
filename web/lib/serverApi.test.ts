import { describe, expect, it } from 'vitest';
import {
  repoApiPath,
  repositoryProxyForwardQuery,
  repositoryProxySubpath
} from './serverApi';

describe('repositoryProxySubpath', () => {
  it('reads catch-all segments from the pathname', () => {
    expect(repositoryProxySubpath('/api/repositories/r1/wiki', 'r1')).toBe('wiki');
    expect(
      repositoryProxySubpath('/api/repositories/r1/graph/path?op=cycles', 'r1')
    ).toBe('graph/path');
  });

  it('ignores query when reading the catch-all pathname', () => {
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

describe('repositoryProxyForwardQuery', () => {
  it('forwards wiki path and revision, omitting route keys', () => {
    expect(
      repositoryProxyForwardQuery(
        {
          repoId: 'r1',
          proxy: ['wiki'],
          path: 'docs/PRD.md',
          revisionSha: '5117ce9'
        },
        ['repoId', 'proxy']
      )
    ).toBe('?path=docs%2FPRD.md&revisionSha=5117ce9');
  });

  it('returns empty when only route keys are present', () => {
    expect(
      repositoryProxyForwardQuery({ repoId: 'r1', proxy: 'wiki' }, ['repoId', 'proxy'])
    ).toBe('');
  });
});
