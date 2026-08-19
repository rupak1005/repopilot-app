import { describe, expect, it } from 'vitest';
import { dependentModules, directDependentModules } from './contextGraph';

describe('contextGraph helpers', () => {
  it('splits direct and transitive module dependents', () => {
    const traversal = {
      file: { filePath: 'web/lib/askThread.ts' },
      directModuleDependents: [{ fromModule: 'web/pages/ask.tsx', toModule: 'web/lib/askThread.ts' }],
      transitiveModuleDependents: [
        { fromModule: 'web/lib/dashboard.tsx', toModule: 'web/lib/askThread.ts' }
      ],
      graphDepth: 2
    };

    expect(directDependentModules(traversal)).toEqual(['web/pages/ask.tsx']);
    expect(dependentModules(traversal)).toEqual(['web/pages/ask.tsx', 'web/lib/dashboard.tsx']);
  });
});
