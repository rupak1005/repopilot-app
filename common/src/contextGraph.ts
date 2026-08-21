/** Shared Context Graph vocabulary — consumed by API, web, MCP, Ask, impact. */

export const CONTEXT_NODE_KINDS = [
  'Organization',
  'Repository',
  'Revision',
  'Directory',
  'File',
  'Module',
  'Function',
  'Class',
  'Method',
  'Interface',
  'Variable',
  'Test',
  'Service',
  'ExternalDependency',
  'PullRequest',
  'Commit',
  'Issue',
  'Documentation',
  'ADR',
  'Owner',
  'Finding',
  /** Legacy/narrow kinds still returned by some slices. */
  'file',
  'symbol'
] as const;

export type ContextNodeKind = (typeof CONTEXT_NODE_KINDS)[number];

export const CONTEXT_EDGE_KINDS = [
  'contains',
  'imports',
  'exports',
  'calls',
  'called_by',
  'extends',
  'implements',
  'references',
  'tests',
  'tested_by',
  'depends_on',
  'depended_on_by',
  'changed_by',
  'changes',
  'documented_by',
  'owned_by',
  'related_to',
  'introduces',
  'fixes'
] as const;

export type ContextEdgeKind = (typeof CONTEXT_EDGE_KINDS)[number];

export type ContextEdgeDetector = 'tree-sitter' | 'heuristic' | 'manual' | 'llm' | 'parser';

export type ContextEdgeProvenance = {
  detector: ContextEdgeDetector;
  confidence: number;
  sourceFile?: string;
  sourceLine?: number;
  /** Declaration / target symbol line when known (call edges). */
  targetLine?: number;
  revisionSha?: string;
};

export type ContextGraphNode = {
  /** Stable URN, e.g. `file:api/src/server.ts` or `symbol:<uuid>`. */
  id: string;
  kind: ContextNodeKind;
  label: string;
  filePath?: string;
  symbolType?: string;
  isHotspot?: boolean;
  score?: number;
};

export type ContextGraphEdge = {
  from: string;
  to: string;
  kind: ContextEdgeKind;
  provenance: ContextEdgeProvenance;
};

const URN_PREFIX = /^(file|symbol|module|dir|repo|rev|ext):/;

export function fileNodeId(filePath: string): string {
  return `file:${filePath}`;
}

export function symbolNodeId(symbolId: string): string {
  return `symbol:${symbolId}`;
}

export function moduleNodeId(modulePath: string): string {
  return `module:${modulePath}`;
}

export function externalNodeId(specifier: string): string {
  return `ext:${specifier}`;
}

export function parseNodeId(
  id: string
): { scheme: string; value: string } | null {
  const match = URN_PREFIX.exec(id);
  if (!match) return null;
  return { scheme: match[1]!, value: id.slice(match[0].length) };
}

/** Prefer file path from a file/module URN; otherwise null. */
export function filePathFromNodeId(id: string): string | null {
  const parsed = parseNodeId(id);
  if (!parsed) {
    // Legacy path-as-id from pre-URN slices.
    if (id.includes('/') || id.endsWith('.ts') || id.endsWith('.tsx') || id.endsWith('.js')) {
      return id;
    }
    return null;
  }
  if (parsed.scheme === 'file' || parsed.scheme === 'module' || parsed.scheme === 'ext') {
    return parsed.value;
  }
  return null;
}

export function symbolIdFromNodeId(id: string): string | null {
  const parsed = parseNodeId(id);
  if (parsed?.scheme === 'symbol') return parsed.value;
  return null;
}

/** Map parser symbol.type strings onto Context Graph node kinds. */
export function symbolTypeToNodeKind(symbolType: string | undefined): ContextNodeKind {
  switch ((symbolType ?? '').toLowerCase()) {
    case 'function':
    case 'function_declaration':
      return 'Function';
    case 'class':
    case 'class_declaration':
      return 'Class';
    case 'method':
    case 'method_declaration':
      return 'Method';
    case 'interface':
    case 'interface_declaration':
      return 'Interface';
    case 'variable':
    case 'const':
    case 'let':
      return 'Variable';
    case 'test':
      return 'Test';
    default:
      return 'symbol';
  }
}

export function defaultImportConfidence(resolvedToKnownFile: boolean): number {
  return resolvedToKnownFile ? 1 : 0.85;
}

/** Call edges are heuristic (name-based), not type-aware. */
export const DEFAULT_CALL_CONFIDENCE = 0.65;
