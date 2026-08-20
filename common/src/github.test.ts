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
    expect(parseGithubRepoUrl('https://www.github.com/acme/widget.git')).toEqual({
      owner: 'acme',
      name: 'widget'
    });
    expect(parseGithubRepoUrl('github.com/acme/widget')).toEqual({
      owner: 'acme',
      name: 'widget'
    });
    expect(parseGithubRepoUrl('https://github.com/acme/widget/tree/main/src')).toEqual({
      owner: 'acme',
      name: 'widget'
    });
  });

  it('rejects empty, org pages, and non-repo hosts', () => {
    expect(parseGithubRepoUrl('')).toBeNull();
    expect(parseGithubRepoUrl('   ')).toBeNull();
    expect(parseGithubRepoUrl('https://github.com/orgs/acme')).toBeNull();
    expect(parseGithubRepoUrl('https://github.com/organizations/acme/repos')).toBeNull();
    expect(parseGithubRepoUrl('https://gitlab.com/acme/widget')).toBeNull();
    expect(parseGithubRepoUrl('https://github.com/only-owner')).toBeNull();
    expect(parseGithubRepoUrl('not a url at all !!!')).toBeNull();
  });
});
