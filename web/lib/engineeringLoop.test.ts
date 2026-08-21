import { describe, expect, it } from 'vitest';
import { engineeringAgentBrief, engineeringLoopStages } from './engineeringLoop';

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
  });
});

describe('engineeringAgentBrief', () => {
  it('includes context pack and find_impact for agents', () => {
    const brief = engineeringAgentBrief({
      repositoryId: 'r1',
      filePath: 'api/src/pay.ts'
    });
    expect(brief).toContain('get_context_pack');
    expect(brief).toContain('find_impact');
    expect(brief).toContain('api/src/pay.ts');
    expect(brief).toContain('testPlan');
  });
});
