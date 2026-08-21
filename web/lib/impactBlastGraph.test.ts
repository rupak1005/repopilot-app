import { describe, expect, it } from 'vitest';
import { forceGraphFromFileImpact } from './impactBlastGraph';
import type { FileImpactAnalysis } from './types';

const sample: FileImpactAnalysis = {
  target: { filePath: 'api/src/pay.ts' },
  revisionSha: 'abc',
  risk: 'HIGH',
  confidence: 'MEDIUM',
  riskFactors: [],
  directDependents: ['api/src/a.ts', 'api/src/b.ts', 'api/src/c.ts'],
  transitiveDependents: ['web/x.tsx', 'web/y.tsx'],
  outboundImports: ['api/src/db.ts'],
  relevantTests: [{ filePath: 'api/src/pay.test.ts', reason: 'direct', confidence: 'HIGH' }],
  coChanges: [],
  hotspot: null,
  checklist: [],
  summary: 'sample'
};

describe('forceGraphFromFileImpact', () => {
  it('builds seed + dependent + import nodes and blast overlay', () => {
    const { data, blast } = forceGraphFromFileImpact(sample);
    expect(blast.seed).toBe('api/src/pay.ts');
    expect(blast.direct).toHaveLength(3);
    expect(data.nodes.some((n) => n.id === 'api/src/pay.ts')).toBe(true);
    expect(data.nodes.some((n) => n.id === 'api/src/db.ts')).toBe(true);
    expect(data.links.length).toBeGreaterThan(0);
  });

  it('respects caps', () => {
    const { data, blast } = forceGraphFromFileImpact(sample, {
      maxDirect: 1,
      maxTransitive: 1,
      maxImports: 0,
      maxTests: 0
    });
    expect(blast.direct).toEqual(['api/src/a.ts']);
    expect(blast.transitive).toEqual(['web/x.tsx']);
    expect(data.nodes.some((n) => n.id === 'api/src/db.ts')).toBe(false);
    expect(data.nodes.some((n) => n.id === 'api/src/pay.test.ts')).toBe(false);
  });
});
