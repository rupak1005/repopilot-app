import { describe, expect, it } from 'vitest';
import { deriveRepositoryId } from './github';

describe('deriveRepositoryId', () => {
  it('is deterministic and case-insensitive', () => {
    const id = deriveRepositoryId('Owner/Repo');
    expect(id).toBe(deriveRepositoryId('owner/repo'));
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
