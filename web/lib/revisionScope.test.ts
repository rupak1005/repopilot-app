import { describe, expect, it } from 'vitest';
import {
  architectureHref,
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
  });

  it('labels the latest revision', () => {
    expect(
      revisionSelectLabel({ revisionSha: 'abcdef123456', indexedAt: '2026-08-20T00:00:00Z' }, 0)
    ).toContain('latest');
  });
});
