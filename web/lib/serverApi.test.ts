import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getApiOrigin,
  repositoryProxyForwardQuery,
  repositoryProxySubpath
} from './serverApi';
import { repoApiPath } from './repoApiPath';

describe('getApiOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires an explicit non-local origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REPOPILOT_API_URL', '');
    vi.stubEnv('API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
    expect(() => getApiOrigin()).toThrow(/not configured/);
  });

  it('accepts the private production API origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REPOPILOT_API_URL', 'https://api.example.com/');
    expect(getApiOrigin()).toBe('https://api.example.com');
  });
});

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
