import type { ContextEdgeDetector } from '@repopilot/common';
import {
  CALL_CONFIDENCE_IMPORT,
  CALL_CONFIDENCE_IMPORT_MEMBER,
  CALL_CONFIDENCE_LOCAL,
  CALL_CONFIDENCE_LOCAL_OBJECT
} from '@repopilot/common';

/**
 * How we grounded a call edge. Never claim type-checker certainty —
 * even `tree-sitter` here means “AST call + resolved declaration”, not types.
 */
export type CallEvidence =
  | 'ast-call-local'
  | 'ast-call-import'
  | 'ast-call-import-member'
  | 'ast-call-local-object';

export type CallEdgeProvenance = {
  kind: 'calls';
  confidence: number;
  detector: ContextEdgeDetector;
  evidence: CallEvidence;
};

export function callEdgeProvenance(evidence: CallEvidence): CallEdgeProvenance {
  switch (evidence) {
    case 'ast-call-local':
      return {
        kind: 'calls',
        confidence: CALL_CONFIDENCE_LOCAL,
        detector: 'tree-sitter',
        evidence
      };
    case 'ast-call-import':
      return {
        kind: 'calls',
        confidence: CALL_CONFIDENCE_IMPORT,
        detector: 'tree-sitter',
        evidence
      };
    case 'ast-call-import-member':
      return {
        kind: 'calls',
        confidence: CALL_CONFIDENCE_IMPORT_MEMBER,
        detector: 'tree-sitter',
        evidence
      };
    case 'ast-call-local-object':
      return {
        kind: 'calls',
        confidence: CALL_CONFIDENCE_LOCAL_OBJECT,
        detector: 'heuristic',
        evidence
      };
  }
}
