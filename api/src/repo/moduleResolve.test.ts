import { describe, expect, it } from 'vitest';
import {
  resolveGoModule,
  resolveJsModule,
  resolveModuleSpecifier,
  resolvePythonModule
} from './moduleResolve';

describe('moduleResolve', () => {
  it('maps FastAPI-style relative and package imports onto .py files', () => {
    const known = new Set([
      'app/main.py',
      'app/db.py',
      'fastapi/routing.py',
      'fastapi/__init__.py'
    ]);

    expect(resolvePythonModule('app/main.py', '.db', known)).toBe('app/db.py');
    expect(resolvePythonModule('app/main.py', 'fastapi.routing', known)).toBe('fastapi/routing.py');
    expect(resolveModuleSpecifier('app/main.py', '.db', known)).toBe('app/db.py');
  });

  it('maps Go import paths onto package directories', () => {
    const known = new Set(['internal/db/open.go', 'cmd/server/main.go']);
    expect(resolveGoModule('cmd/server/main.go', 'github.com/org/repo/internal/db', known)).toBe(
      'internal/db/open.go'
    );
    expect(resolveGoModule('internal/db/open.go', './sibling', new Set(['internal/db/sibling/x.go']))).toBe(
      'internal/db/sibling/x.go'
    );
  });

  it('resolves @/ aliases against the package root', () => {
    const known = new Set([
      'web/lib/dashboard.tsx',
      'web/components/AppShell.tsx',
      'web/src/utils/format.ts',
      'src/hooks/useRepo.ts'
    ]);
    expect(resolveJsModule('web/lib/dashboard.tsx', '@/components/AppShell', known)).toBe(
      'web/components/AppShell.tsx'
    );
    expect(resolveJsModule('web/src/pages/home.tsx', '@/utils/format', known)).toBe(
      'web/src/utils/format.ts'
    );
    expect(resolveModuleSpecifier('src/app.tsx', '@/hooks/useRepo', known)).toBe('src/hooks/useRepo.ts');
    expect(resolveJsModule('web/lib/x.ts', '@/missing', known)).toBeNull();
  });
});
