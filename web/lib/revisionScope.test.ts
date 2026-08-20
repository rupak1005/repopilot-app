import { describe, expect, it } from 'vitest';
import {
  architectureHref,
  impactHref,
  impactRouteQuery,
  matchRevisionValue,
  parseRevisionQuery,
  revisionSelectLabel,
  withRevisionSha
} from './revisionScope';

describe('revisionScope', () => {
  it('parses revision query values', () => {
    expect(parseRevisionQuery('abcdef1')).toBe('abcdef1');
    expect(parseRevisionQuery('ab')).toBeNull();
    expect(parseRevisionQuery(['abcdef1'])).toBeNull();
  });

  it('appends revisionSha to API subpaths', () => {
    expect(withRevisionSha('architecture', 'abc')).toBe('architecture?revisionSha=abc');
    expect(withRevisionSha('graph?op=cycles', 'abc')).toBe('graph?op=cycles&revisionSha=abc');
    expect(withRevisionSha('architecture', null)).toBe('architecture');
  });

  it('builds architecture deep links', () => {
    expect(architectureHref('r1')).toBe('/dashboard/r1/architecture');
    expect(architectureHref('r1', 'deadbeef')).toBe('/dashboard/r1/architecture?rev=deadbeef');
    expect(architectureHref('r1', { file: 'a.ts', blast: true, revisionSha: 'abc1234' })).toBe(
      '/dashboard/r1/architecture?file=a.ts&blast=1&rev=abc1234'
    );
  });

  it('builds impact deep links', () => {
    expect(impactHref('r1', { file: 'web/lib/x.ts' })).toBe(
      '/dashboard/r1/impact?file=web%2Flib%2Fx.ts'
    );
    expect(impactHref('r1', { pull: 42, revisionSha: 'deadbeef' })).toBe(
      '/dashboard/r1/impact?pull=42&rev=deadbeef'
    );
    expect(impactHref('r1', { symbol: 'Foo', revisionSha: 'abc1234' })).toContain('symbol=Foo');
  });

  it('builds impact route query bags', () => {
    expect(impactRouteQuery('file', { file: 'a.ts' }, 'abc1234')).toEqual({
      file: 'a.ts',
      rev: 'abc1234'
    });
    expect(impactRouteQuery('pull', { pull: '9' })).toEqual({ pull: '9' });
  });

  it('matches select values for partial SHAs', () => {
    const rows = [{ revisionSha: 'abcdef123456', indexedAt: '2026-08-20T00:00:00Z' }];
    expect(matchRevisionValue(rows, 'abcdef1')).toBe('abcdef123456');
    expect(matchRevisionValue(rows, null)).toBe('');
  });

  it('labels the latest revision', () => {
    expect(
      revisionSelectLabel({ revisionSha: 'abcdef123456', indexedAt: '2026-08-20T00:00:00Z' }, 0)
    ).toContain('latest');
  });
});
