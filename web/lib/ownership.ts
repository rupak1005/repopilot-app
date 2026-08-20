export type OwnershipRule = {
  pattern: string;
  owners: string[];
  line: number;
};

export type OwnershipSummary = {
  revisionSha: string | null;
  sourcePath: string | null;
  rules: OwnershipRule[];
  path: string | null;
  owners: string[];
};

export function githubOwnerHref(owner: string, repoFullName?: string | null): string | null {
  if (owner.startsWith('@') && owner.includes('/')) {
    const [org, team] = owner.slice(1).split('/');
    if (!org || !team) return null;
    return `https://github.com/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(team)}`;
  }
  if (owner.startsWith('@')) {
    return `https://github.com/${encodeURIComponent(owner.slice(1))}`;
  }
  if (owner.includes('@') && repoFullName?.includes('/')) {
    return `https://github.com/${repoFullName}/blob/HEAD/CODEOWNERS`;
  }
  return null;
}

export function formatOwnershipLabel(owners: string[]): string {
  if (owners.length === 0) return 'No CODEOWNERS match';
  if (owners.length === 1) return owners[0]!;
  return `${owners[0]} +${owners.length - 1}`;
}
