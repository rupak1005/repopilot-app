import { describe, expect, it } from 'vitest';
import {
  citationArchitectureHref,
  citationGithubUrl,
  citationImpactHref
} from './citationLinks';

describe('citationLinks', () => {
  it('builds dashboard deep links', () => {
    expect(citationArchitectureHref('r1', 'web/lib/x.ts')).toBe(
      '/dashboard/r1/architecture?file=web%2Flib%2Fx.ts'
    );
    expect(citationImpactHref('r1', 'web/lib/x.ts')).toBe(
      '/dashboard/r1/impact?file=web%2Flib%2Fx.ts'
    );
  });

  it('appends GitHub line anchors for file paths', () => {
    expect(citationGithubUrl('ada/app', 'src/auth.ts', [10, 20], 'abc1234')).toBe(
      'https://github.com/ada/app/blob/abc1234/src/auth.ts#L10-L20'
    );
    expect(citationGithubUrl('ada/app', 'src/auth.ts', [7, 7])).toContain('#L7');
  });
});
