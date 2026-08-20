import { githubModuleUrl, looksLikeRepoFilePath } from './modulePaths';
import { architectureHref, impactHref } from './revisionScope';

export function citationArchitectureHref(
  repoId: string,
  file: string,
  revisionSha?: string | null
): string {
  return architectureHref(repoId, { file, revisionSha });
}

export function citationImpactHref(
  repoId: string,
  file: string,
  revisionSha?: string | null
): string {
  return impactHref(repoId, { file, revisionSha });
}

/** GitHub blob URL with #Lstart-Lend when the path looks like a real file. */
export function citationGithubUrl(
  repoFullName: string,
  file: string,
  lines: [number, number],
  revisionSha?: string
): string {
  const base = githubModuleUrl(repoFullName, file, revisionSha);
  if (!looksLikeRepoFilePath(file) || base.includes('/search?')) return base;
  const start = Math.max(1, lines[0]);
  const end = Math.max(start, lines[1]);
  if (start === end) return `${base}#L${start}`;
  return `${base}#L${start}-L${end}`;
}
