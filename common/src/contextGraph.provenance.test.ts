import { describe, expect, it } from 'vitest';
import type { ContextEdgeProvenance } from '@repopilot/common';

describe('edge provenance targetLine', () => {
  it('allows optional targetLine on ContextEdgeProvenance', () => {
    const provenance: ContextEdgeProvenance = {
      detector: 'heuristic',
      confidence: 0.65,
      sourceFile: 'src/a.ts',
      sourceLine: 12,
      targetLine: 4,
      revisionSha: 'abc'
    };
    expect(provenance.targetLine).toBe(4);
  });
});
