import crypto from 'crypto';

export function deriveRepositoryId(fullName: string): string {
  const hash = crypto.createHash('sha256').update(fullName.toLowerCase()).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/** Parse github.com URLs and owner/repo shorthand. */
export function parseGithubRepoUrl(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed) && !trimmed.includes('://')) {
    const [owner, name] = trimmed.split('/');
    if (owner && name) return { owner, name };
  }

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, '');
    const repoHosts = new Set(['github.com', 'gitpilot.com', 'gitpilot.dev']);
    if (!repoHosts.has(host) && !host.endsWith('.gitpilot.com')) return null;

    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    if (parts[0] === 'orgs' || parts[0] === 'organizations') return null;

    const owner = parts[0];
    let name = parts[1];
    if (parts[2] === 'tree' || parts[2] === 'blob') {
      // allow links that point at a file — repo is still parts[0]/parts[1]
    }
    name = name.replace(/\.git$/i, '');
    if (!owner || !name) return null;
    return { owner, name };
  } catch {
    return null;
  }
}
