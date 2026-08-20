import { describe, expect, it } from 'vitest';
import {
  aliasCandidateBases,
  collectPathAliasesFromFiles,
  parseTsconfigPathAliases
} from './tsconfigPaths';
import { resolveJsModule } from './moduleResolve';

describe('tsconfigPaths', () => {
  it('parses paths relative to the config directory and baseUrl', () => {
    const rules = parseTsconfigPathAliases(
      `{
        // comment ok
        "compilerOptions": {
          "baseUrl": ".",
          "paths": {
            "@/*": ["./src/*"],
            "@lib/*": ["lib/*"]
          }
        }
      }`,
      'web/tsconfig.json'
    );
    expect(rules[0]?.prefix).toBe('@lib/');
    expect(rules[0]?.targets).toEqual(['web/lib']);
    expect(rules[1]?.prefix).toBe('@/');
    expect(rules[1]?.targets).toEqual(['web/src']);
  });

  it('expands alias candidates with longest-prefix wins', () => {
    const rules = parseTsconfigPathAliases(
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@/*': ['src/*'], '@lib/*': ['lib/*'] }
        }
      }),
      'pkg/tsconfig.json'
    );
    expect(aliasCandidateBases('@lib/format', rules)).toEqual(['pkg/lib/format']);
    expect(aliasCandidateBases('@/hooks/useX', rules)).toEqual(['pkg/src/hooks/useX']);
  });

  it('resolves imports using collected tsconfig aliases before the @/ heuristic', () => {
    const files = [
      {
        path: 'apps/web/tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: { '~/*': ['./src/*'] }
          }
        })
      },
      { path: 'apps/web/src/pages/home.tsx', content: '' },
      { path: 'apps/web/src/utils/format.ts', content: '' }
    ];
    const aliases = collectPathAliasesFromFiles(files);
    const known = new Set(files.map((f) => f.path));
    expect(
      resolveJsModule('apps/web/src/pages/home.tsx', '~/utils/format', known, aliases)
    ).toBe('apps/web/src/utils/format.ts');
  });
});
