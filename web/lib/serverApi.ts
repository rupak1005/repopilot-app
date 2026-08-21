import type { SessionData } from './session';

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function internalApiHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (secret) {
    headers['x-repopilot-internal-key'] = secret;
  }
  if (extra) {
    Object.assign(headers, extra);
  }
  return headers;
}

export function assertRepoSession(
  session: SessionData | null,
  repoId: string
): session is SessionData {
  if (!session?.selectedRepoId) return false;
  return session.selectedRepoId === repoId;
}

export async function proxyApiRequest(
  apiPath: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${API_ORIGIN}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  const headers = internalApiHeaders(init?.headers);
  return fetch(url, { ...init, headers });
}

export function repoApiPath(repoId: string, subpath: string): string {
  const clean = subpath.replace(/^\//, '');
  return `/api/repositories/${repoId}/${clean}`;
}

/**
 * Catch-all segments for `/api/repositories/:repoId/[...proxy]`.
 * Read from the pathname — never the catch-all query key — so routing stays stable.
 */
export function repositoryProxySubpath(reqUrl: string | undefined, repoId: string): string {
  const pathname = (reqUrl ?? '').split('?')[0] ?? '';
  const needle = `/repositories/${repoId}/`;
  const at = pathname.indexOf(needle);
  if (at < 0) return '';
  return pathname.slice(at + needle.length).replace(/^\/+|\/+$/g, '');
}

/**
 * Forward client query params to the API, omitting Next route keys.
 * Named `[...proxy]` (not `[...path]`) so wiki/ownership `?path=` is preserved.
 */
export function repositoryProxyForwardQuery(
  query: Record<string, string | string[] | undefined>,
  omitKeys: string[] = ['repoId', 'proxy']
): string {
  const omit = new Set(omitKeys);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (omit.has(key) || value == null) continue;
    for (const part of Array.isArray(value) ? value : [value]) {
      if (part !== '') params.append(key, part);
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}
