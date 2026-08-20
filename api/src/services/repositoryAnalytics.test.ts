import { describe, expect, it } from 'vitest';
import { listRepositoryFindings, listReviewHistory } from './repositoryAnalytics';

describe('repositoryAnalytics findings surface', () => {
  it('exports listRepositoryFindings for the Change → Findings page', () => {
    expect(typeof listRepositoryFindings).toBe('function');
    expect(typeof listReviewHistory).toBe('function');
  });
});
