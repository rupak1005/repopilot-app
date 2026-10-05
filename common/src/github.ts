import crypto from 'crypto';

export function deriveRepositoryId(fullName: string): string {
  const hash = crypto.createHash('sha256').update(fullName.toLowerCase()).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export type GithubRepositoryInput = {
  owner: string;
  name: string;
  ref?: string;
  path?: string;
};

/** Parse legitimate github.com URLs and owner/repo shorthand. */
export function parseGithubRepoUrl(input: string): GithubRepositoryInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed) && !trimmed.includes('://')) {
    const [owner, name] = trimmed.split('/');
    if (owner && name) return { owner, name };
  }

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') return null;

    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    if (parts[0] === 'orgs' || parts[0] === 'organizations') return null;

    const owner = parts[0];
    let name = parts[1];
    const kind = parts[2];
    if (kind && kind !== 'tree' && kind !== 'blob') return null;
    name = name.replace(/\.git$/i, '');
    if (!owner || !name) return null;
    if (!kind) return { owner, name };

    const ref = parts[3];
    if (!ref) return { owner, name };
    return {
      owner,
      name,
      ref,
      path: parts.slice(4).join('/') || undefined
    };
  } catch {
    return null;
  }
}
