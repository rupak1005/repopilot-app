import { defineConfig } from 'vitest/config';
import path from 'node:path';

const repoRoot = path.resolve(__dirname);

export default defineConfig({
  root: repoRoot,
  test: {
    environment: 'node',
    include: [
      path.join(repoRoot, 'tests/**/*.test.ts'),
      path.join(repoRoot, 'api/**/*.test.ts'),
      path.join(repoRoot, 'common/**/*.test.ts'),
      path.join(repoRoot, 'web/**/*.test.ts')
    ],
    passWithNoTests: true
  }
});

