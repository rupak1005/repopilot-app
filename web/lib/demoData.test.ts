import { describe, expect, it, vi, afterEach } from 'vitest';
import { demoPullDetail, demoPullImpact, demoFileImpact, demoSearchResults } from './demoData';
import { isDemoMode } from './demoMode';

describe('isDemoMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true when NEXT_PUBLIC_DEMO_MODE is true', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    expect(isDemoMode()).toBe(true);
  });

  it('returns false otherwise', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
    expect(isDemoMode()).toBe(false);
  });
});

describe('demoSearchResults', () => {
  it('filters hits by query', () => {
    const hits = demoSearchResults('syncRepository');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.text.includes('syncRepository'))).toBe(true);
  });
});

describe('demoPullDetail', () => {
  it('returns PaymentService flagship PR #42 with findings', () => {
    const detail = demoPullDetail(42);
    expect(detail?.title).toContain('PaymentService');
    expect(detail?.latestReview?.findings).toHaveLength(1);
    expect(detail?.latestReview?.findings[0]?.severity).toBe('HIGH');
  });

  it('returns impact summary for flagship PR', () => {
    const impact = demoPullImpact(42);
    expect(impact?.risk).toBe('HIGH');
    expect(impact?.transitiveDependents).toBe(14);
  });

  it('returns file impact for PaymentService demo path', () => {
    const impact = demoFileImpact('api/src/services/PaymentService.ts');
    expect(impact?.risk).toBe('HIGH');
    expect(impact?.relevantTests.length).toBeGreaterThan(0);
  });
});
