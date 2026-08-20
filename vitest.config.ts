import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import path from 'node:path';

const repoRoot = path.resolve(__dirname);

/** Transforms .tsx for vitest when oxc skips JSX (web tsconfig uses jsx: preserve). */
function tsxEsbuildPlugin() {
  return {
    name: 'tsx-esbuild',
    async transform(code: string, id: string) {
      if (!id.endsWith('.tsx') || id.includes('node_modules')) return;
      return transformWithEsbuild(code, id, {
        loader: 'tsx',
        jsx: 'automatic'
      });
    }
  };
}

export default defineConfig({
  root: repoRoot,
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: path.join(repoRoot, 'coverage'),
      reporter: ['text', 'json-summary', 'lcov'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        '**/node_modules/**',
        'api/src/server.ts',
        'api/src/worker.ts',
        'api/src/cli.ts',
        'api/src/mcp/**',
        'web/lib/mermaidClient.ts',
        'web/lib/session.ts',
        'web/lib/serverApi.ts',
        'web/lib/github.ts',
        'web/lib/indexProgressUi.tsx',
        'web/lib/diagramTheme.ts',
        'web/lib/docsNav.ts',
        'web/pages/**',
        'web/components/**'
      ],
      thresholds: {
        'api/src/services/**': { lines: 20, functions: 20, branches: 18, statements: 20 },
        'api/src/middleware/**': { lines: 80, functions: 80, branches: 75, statements: 80 },
        'api/src/repo/**': { lines: 20, functions: 20, branches: 18, statements: 20 },
        'web/lib/**': { lines: 35, functions: 35, branches: 30, statements: 35 },
        'common/src/**': { lines: 75, functions: 75, branches: 65, statements: 75 }
      }
    },
    projects: [
      {
        test: {
          name: 'api',
          root: repoRoot,
          environment: 'node',
          include: [
            path.join(repoRoot, 'tests/**/*.test.ts'),
            path.join(repoRoot, 'api/**/*.test.ts')
          ]
        }
      },
      {
        test: {
          name: 'common',
          root: repoRoot,
          environment: 'node',
          include: [path.join(repoRoot, 'common/**/*.test.ts')]
        }
      },
      {
        plugins: [tsxEsbuildPlugin()],
        test: {
          name: 'web',
          root: path.join(repoRoot, 'web'),
          environment: 'node',
          setupFiles: [path.join(repoRoot, 'web/test/setup.ts')],
          include: ['**/*.test.ts', '**/*.test.tsx']
        }
      }
    ],
    passWithNoTests: true
  }
});
