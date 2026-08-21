import { describe, expect, it } from 'vitest';
import {
  architectureHref,
  architectureRouteQuery,
  impactHref,
  impactRouteQuery,
  matchRevisionValue,
  parseArchitectureLayoutQuery,
  parseRevisionQuery,
  revisionSelectLabel,
  viz3dHref,
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
    expect(architectureHref('r1', { layout: 'system', file: 'a.ts' })).toBe(
      '/dashboard/r1/architecture?file=a.ts&layout=system'
    );
    expect(architectureHref('r1', { layout: 'flow' })).toBe('/dashboard/r1/architecture');
  });

  it('parses architecture layout query', () => {
    expect(parseArchitectureLayoutQuery('system')).toBe('system');
    expect(parseArchitectureLayoutQuery('elk')).toBe('system');
    expect(parseArchitectureLayoutQuery('flow')).toBe('flow');
    expect(parseArchitectureLayoutQuery(undefined)).toBe('flow');
  });

  it('builds architecture route query bags', () => {
    expect(
      architectureRouteQuery({
        file: 'a.ts',
        blast: true,
        layout: 'system',
        revisionSha: 'abc1234'
      })
    ).toEqual({ file: 'a.ts', blast: '1', layout: 'system', rev: 'abc1234' });
    expect(architectureRouteQuery({ layout: 'flow' })).toEqual({});
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

  it('builds opt-in 3D explore deep links', () => {
    expect(viz3dHref('r1')).toBe('/dashboard/r1/viz-spike');
    expect(viz3dHref('r1', { file: 'a.ts', blast: true, revisionSha: 'abc1234', layout: 'system' })).toBe(
      '/dashboard/r1/viz-spike?file=a.ts&blast=1&layout=system&rev=abc1234'
    );
    expect(viz3dHref('r1', { topo: true, windowDays: 90 })).toBe(
      '/dashboard/r1/viz-spike?topo=1&window=90'
    );
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
