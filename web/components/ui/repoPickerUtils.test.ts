import { describe, expect, it } from 'vitest';
import { filterUserRepos, splitRepoFullName } from './repoPickerUtils';

const repos = [
  {
    fullName: 'ada/syncify',
    owner: 'ada',
    name: 'syncify',
    description: 'Music streaming',
    private: false,
    updatedAt: '2026-08-19T00:00:00.000Z'
  },
  {
    fullName: 'ada/livedocs',
    owner: 'ada',
    name: 'livedocs',
    description: 'Realtime editor',
    private: true,
    updatedAt: '2026-08-10T00:00:00.000Z'
  }
];

describe('repoPickerUtils', () => {
  it('splits owner/name', () => {
    expect(splitRepoFullName('ada/syncify')).toEqual({ owner: 'ada', name: 'syncify' });
  });

  it('searches, filters visibility, and sorts', () => {
    expect(filterUserRepos(repos, 'sync', 'all', 'name').map((repo) => repo.name)).toEqual(['syncify']);
    expect(filterUserRepos(repos, '', 'private', 'updated').map((repo) => repo.name)).toEqual(['livedocs']);
    expect(filterUserRepos(repos, '', 'all', 'name').map((repo) => repo.name)).toEqual(['livedocs', 'syncify']);
  });
});
