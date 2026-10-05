/** Browser-safe BFF path builder. This module must not read server environment variables. */
export function repoApiPath(repoId: string, subpath: string): string {
  const clean = subpath.replace(/^\//, '');
  return `/api/repositories/${repoId}/${clean}`;
}
