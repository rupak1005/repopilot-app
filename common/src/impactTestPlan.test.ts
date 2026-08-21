import { describe, expect, it } from 'vitest';
import { buildImpactTestPlan, classifyImpactTestPath } from './impactTestPlan';

describe('classifyImpactTestPath', () => {
  it('maps known monorepo workspaces', () => {
    expect(classifyImpactTestPath('api/src/pay.test.ts')).toEqual({
      filePath: 'api/src/pay.test.ts',
      packageName: '@repopilot/api',
      fileArg: 'src/pay.test.ts',
      runner: 'vitest-workspace'
    });
    expect(classifyImpactTestPath('web/lib/foo.test.ts').packageName).toBe('@repopilot/web');
  });

  it('maps packages/* and apps/*', () => {
    expect(classifyImpactTestPath('packages/payments/src/a.test.ts')).toMatchObject({
      packageName: 'payments',
      fileArg: 'src/a.test.ts'
    });
    expect(classifyImpactTestPath('apps/web/src/a.test.ts').packageName).toBe('web');
  });

  it('falls back to root vitest', () => {
    expect(classifyImpactTestPath('scripts/check.test.ts').runner).toBe('vitest-root');
  });
});

describe('buildImpactTestPlan', () => {
  it('groups commands by workspace', () => {
    const plan = buildImpactTestPlan([
      'api/src/a.test.ts',
      'api/src/b.test.ts',
      'web/lib/c.test.ts'
    ]);
    expect(plan.commands).toHaveLength(2);
    expect(plan.commands.find((c) => c.packageName === '@repopilot/api')?.command).toBe(
      'yarn workspace @repopilot/api test src/a.test.ts src/b.test.ts'
    );
    expect(plan.shellScript).toContain('@repopilot/web');
  });
});
