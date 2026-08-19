import { describe, expect, it } from 'vitest';
import { deriveRepositoryId, parseGithubRepoUrl } from './github';

describe('deriveRepositoryId', () => {
  it('is deterministic and case-insensitive', () => {
    const id = deriveRepositoryId('Owner/Repo');
    expect(id).toBe(deriveRepositoryId('owner/repo'));
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe('parseGithubRepoUrl', () => {
  it('parses https github URLs and shorthand', () => {
    expect(parseGithubRepoUrl('https://github.com/torvalds/linux')).toEqual({
      owner: 'torvalds',
      name: 'linux'
    });
    expect(parseGithubRepoUrl('torvalds/linux')).toEqual({ owner: 'torvalds', name: 'linux' });
    expect(parseGithubRepoUrl('https://gitpilot.com/fastapi/fastapi')).toEqual({
      owner: 'fastapi',
      name: 'fastapi'
    });
  });
});
