import { describe, expect, it } from 'vitest';
import { EXAMPLE_REPOS, PREINDEX_EXAMPLE_SLUGS } from './exampleRepos';

describe('exampleRepos', () => {
  it('keeps preindex slugs in the curated list', () => {
    const slugs = new Set(EXAMPLE_REPOS.map((repo) => repo.slug));
    for (const slug of PREINDEX_EXAMPLE_SLUGS) {
      expect(slugs.has(slug)).toBe(true);
    }
  });
});
