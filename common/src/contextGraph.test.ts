import { describe, expect, it } from 'vitest';
import {
  CONTEXT_EDGE_KINDS,
  CONTEXT_NODE_KINDS,
  CALL_CONFIDENCE_LOCAL,
  DEFAULT_CALL_CONFIDENCE,
  defaultImportConfidence,
  externalNodeId,
  fileNodeId,
  filePathFromNodeId,
  moduleNodeId,
  parseNodeId,
  symbolIdFromNodeId,
  symbolNodeId,
  symbolTypeToNodeKind
} from './contextGraph';

describe('contextGraph URNs', () => {
  it('builds and parses file, symbol, module, and external ids', () => {
    expect(fileNodeId('api/src/server.ts')).toBe('file:api/src/server.ts');
    expect(moduleNodeId('web/lib')).toBe('module:web/lib');
    expect(externalNodeId('react')).toBe('ext:react');
    expect(parseNodeId(symbolNodeId('abc-123'))).toEqual({ scheme: 'symbol', value: 'abc-123' });
    expect(parseNodeId('not-a-urn')).toBeNull();
    expect(symbolIdFromNodeId('symbol:abc-123')).toBe('abc-123');
    expect(symbolIdFromNodeId('file:x.ts')).toBeNull();
  });

  it('extracts file paths from URNs and legacy path ids', () => {
    expect(filePathFromNodeId('file:web/lib/foo.ts')).toBe('web/lib/foo.ts');
    expect(filePathFromNodeId('module:web/lib')).toBe('web/lib');
    expect(filePathFromNodeId('ext:lodash')).toBe('lodash');
    expect(filePathFromNodeId('web/lib/foo.ts')).toBe('web/lib/foo.ts');
    expect(filePathFromNodeId('thing.js')).toBe('thing.js');
    expect(filePathFromNodeId('symbol:abc')).toBeNull();
    expect(filePathFromNodeId('rev:deadbeef')).toBeNull();
    expect(filePathFromNodeId('plain')).toBeNull();
  });

  it('maps symbol types and confidence defaults', () => {
    expect(symbolTypeToNodeKind('function')).toBe('Function');
    expect(symbolTypeToNodeKind('function_declaration')).toBe('Function');
    expect(symbolTypeToNodeKind('class')).toBe('Class');
    expect(symbolTypeToNodeKind('class_declaration')).toBe('Class');
    expect(symbolTypeToNodeKind('method')).toBe('Method');
    expect(symbolTypeToNodeKind('method_declaration')).toBe('Method');
    expect(symbolTypeToNodeKind('interface')).toBe('Interface');
    expect(symbolTypeToNodeKind('interface_declaration')).toBe('Interface');
    expect(symbolTypeToNodeKind('variable')).toBe('Variable');
    expect(symbolTypeToNodeKind('const')).toBe('Variable');
    expect(symbolTypeToNodeKind('let')).toBe('Variable');
    expect(symbolTypeToNodeKind('test')).toBe('Test');
    expect(symbolTypeToNodeKind(undefined)).toBe('symbol');
    expect(symbolTypeToNodeKind('unknown')).toBe('symbol');
    expect(defaultImportConfidence(true)).toBe(1);
    expect(defaultImportConfidence(false)).toBe(0.85);
    expect(DEFAULT_CALL_CONFIDENCE).toBeLessThan(1);
    expect(CALL_CONFIDENCE_LOCAL).toBeGreaterThan(DEFAULT_CALL_CONFIDENCE);
    expect(CALL_CONFIDENCE_LOCAL).toBeLessThan(1);
  });

  it('exposes shared vocabulary lists', () => {
    expect(CONTEXT_NODE_KINDS).toContain('File');
    expect(CONTEXT_EDGE_KINDS).toContain('imports');
  });
});
