import { describe, expect, it } from 'vitest';
import {
  CALL_CONFIDENCE_IMPORT,
  CALL_CONFIDENCE_LOCAL,
  CALL_CONFIDENCE_LOCAL_OBJECT,
  DEFAULT_CALL_CONFIDENCE
} from '@repopilot/common';
import { callEdgeProvenance } from './callEdgePolicy';

describe('callEdgePolicy', () => {
  it('tiers confidence and never claims deterministic type-aware calls', () => {
    expect(CALL_CONFIDENCE_LOCAL).toBeLessThan(1);
    expect(CALL_CONFIDENCE_IMPORT).toBeLessThan(CALL_CONFIDENCE_LOCAL);
    expect(DEFAULT_CALL_CONFIDENCE).toBeLessThan(CALL_CONFIDENCE_LOCAL_OBJECT);

    expect(callEdgeProvenance('ast-call-local')).toMatchObject({
      kind: 'calls',
      detector: 'tree-sitter',
      confidence: CALL_CONFIDENCE_LOCAL
    });
    expect(callEdgeProvenance('ast-call-import').detector).toBe('tree-sitter');
    expect(callEdgeProvenance('ast-call-local-object')).toMatchObject({
      detector: 'heuristic',
      confidence: CALL_CONFIDENCE_LOCAL_OBJECT
    });
  });
});
