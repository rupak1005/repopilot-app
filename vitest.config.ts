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
