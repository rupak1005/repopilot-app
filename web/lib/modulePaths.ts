/** Shared helpers for architecture module IDs (may be file paths or unresolved aliases like `@/…`). */

export function stripModuleAlias(moduleId: string): string {
  const trimmed = moduleId.trim();
  if (trimmed.startsWith('@/')) return trimmed.slice(2);
  if (trimmed.startsWith('@')) return trimmed.slice(1);
  return trimmed;
}

/** Leaf file/module name for search boxes — `viewer-provider` from `@/components/…/viewer-provider`. */
export function moduleSearchQuery(moduleId: string): string {
  const cleaned = stripModuleAlias(moduleId);
  const leaf = cleaned.split('/').filter(Boolean).pop() ?? cleaned;
  return leaf.replace(/\.(tsx?|jsx?|mjs|cjs|py|go)$/i, '');
}

export function looksLikeRepoFilePath(moduleId: string): boolean {
  const path = stripModuleAlias(moduleId);
  return /\.(tsx?|jsx?|mjs|cjs|py|go)$/i.test(path) && !path.includes('://');
}

/** Blob URL when we know the path; otherwise in-repo code search for the leaf name. */
export function githubModuleUrl(repoFullName: string, moduleId: string, revisionSha?: string): string {
  const slug = repoFullName.trim();
  if (!slug.includes('/')) {
    return `https://github.com/${encodeURIComponent(slug)}`;
  }

  const ref =
    revisionSha && /^[0-9a-f]{7,40}$/i.test(revisionSha.trim()) ? revisionSha.trim() : 'HEAD';
  const path = stripModuleAlias(moduleId);

  if (looksLikeRepoFilePath(moduleId)) {
    return `https://github.com/${slug}/blob/${ref}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  // Extensionless / alias modules: land on GitHub code search inside the repo.
  const q = moduleSearchQuery(moduleId);
  const pathHint = path.includes('/') ? path.split('/').slice(0, -1).join('/') : '';
  const query = pathHint ? `${q} path:${pathHint}` : q;
  return `https://github.com/${slug}/search?q=${encodeURIComponent(query)}&type=code`;
}
