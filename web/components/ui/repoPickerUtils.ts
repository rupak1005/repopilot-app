export function splitRepoFullName(fullName: string): { owner: string; name: string } {
  const slash = fullName.indexOf('/');
  if (slash === -1) return { owner: '', name: fullName };
  return { owner: fullName.slice(0, slash), name: fullName.slice(slash + 1) };
}

export type RepoVisibilityFilter = 'all' | 'public' | 'private';
export type RepoSort = 'updated' | 'name';

export type FilterableRepo = {
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  private: boolean;
  updatedAt: string;
};

export function filterUserRepos<T extends FilterableRepo>(
  repos: T[],
  query: string,
  visibility: RepoVisibilityFilter,
  sort: RepoSort
): T[] {
  const needle = query.trim().toLowerCase();
  const matched = repos.filter((repo) => {
    if (visibility === 'public' && repo.private) return false;
    if (visibility === 'private' && !repo.private) return false;
    if (!needle) return true;
    const haystack = `${repo.fullName} ${repo.owner} ${repo.name} ${repo.description ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });

  return matched.sort((a, b) => {
    if (sort === 'name') return a.fullName.localeCompare(b.fullName);
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}
