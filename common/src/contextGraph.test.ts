import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CALL_CONFIDENCE,
  defaultImportConfidence,
  fileNodeId,
  filePathFromNodeId,
  parseNodeId,
  symbolNodeId,
  symbolTypeToNodeKind
} from './contextGraph';

describe('contextGraph URNs', () => {
  it('round-trips file and symbol ids', () => {
    expect(fileNodeId('api/src/server.ts')).toBe('file:api/src/server.ts');
    expect(parseNodeId(symbolNodeId('abc-123'))).toEqual({ scheme: 'symbol', value: 'abc-123' });
    expect(filePathFromNodeId('file:web/lib/foo.ts')).toBe('web/lib/foo.ts');
    expect(filePathFromNodeId('web/lib/foo.ts')).toBe('web/lib/foo.ts');
  });

  it('maps symbol types and confidence defaults', () => {
    expect(symbolTypeToNodeKind('function')).toBe('Function');
    expect(symbolTypeToNodeKind('class')).toBe('Class');
    expect(defaultImportConfidence(true)).toBe(1);
    expect(defaultImportConfidence(false)).toBe(0.85);
    expect(DEFAULT_CALL_CONFIDENCE).toBeLessThan(1);
  });
});
