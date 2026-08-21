import { describe, expect, it } from 'vitest';
import {
  engineeringAgentBrief,
  engineeringLoopStages,
  parseEngineeringLoopPull
} from './engineeringLoop';

describe('parseEngineeringLoopPull', () => {
  it('accepts positive integers only', () => {
    expect(parseEngineeringLoopPull('42')).toBe(42);
    expect(parseEngineeringLoopPull('0')).toBeNull();
    expect(parseEngineeringLoopPull('nope')).toBeNull();
  });
});

describe('engineeringLoopStages', () => {
  it('returns the six ordered stages with dashboard links', () => {
    const stages = engineeringLoopStages({
      repoId: 'r1',
      filePath: 'api/src/pay.ts',
      revisionSha: 'abc'
    });
    expect(stages.map((s) => s.id)).toEqual([
      'plan',
      'agent',
      'pr',
      'impact',
      'review',
      'verify'
    ]);
    expect(stages[0]?.href).toContain('/planning?file=');
    expect(stages.find((s) => s.id === 'impact')?.href).toContain('impact?file=');
    expect(stages.find((s) => s.id === 'verify')?.href).toContain('impact?file=');
    expect(stages.find((s) => s.id === 'pr')?.href).toBe('/dashboard/r1/pulls');
  });

  it('deep-links PR and Review when pullNumber is set', () => {
    const stages = engineeringLoopStages({
      repoId: 'r1',
      filePath: 'api/src/pay.ts',
      pullNumber: 87
    });
    expect(stages.find((s) => s.id === 'pr')?.href).toBe('/dashboard/r1/pulls/87');
    expect(stages.find((s) => s.id === 'review')?.href).toBe('/dashboard/r1/pulls/87');
    expect(stages.find((s) => s.id === 'plan')?.href).toContain('pull=87');
    expect(stages.find((s) => s.id === 'impact')?.href).toContain('pull=87');
  });
});

describe('engineeringAgentBrief', () => {
  it('includes context pack and find_impact for agents', () => {
    const brief = engineeringAgentBrief({
      repositoryId: 'r1',
      filePath: 'api/src/pay.ts',
      pullNumber: 12
    });
    expect(brief).toContain('get_context_pack');
    expect(brief).toContain('find_impact');
    expect(brief).toContain('api/src/pay.ts');
    expect(brief).toContain('testPlan');
    expect(brief).toContain('PR #12');
  });
});
