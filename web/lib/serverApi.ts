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
 * Catch-all segments for `/api/repositories/:repoId/[...path]`.
 * Read from the pathname — never `req.query.path` — so a `?path=` query
 * (wiki / ownership) does not collide with the dynamic route name.
 */
export function repositoryProxySubpath(reqUrl: string | undefined, repoId: string): string {
  const pathname = (reqUrl ?? '').split('?')[0] ?? '';
  const needle = `/repositories/${repoId}/`;
  const at = pathname.indexOf(needle);
  if (at < 0) return '';
  return pathname.slice(at + needle.length).replace(/^\/+|\/+$/g, '');
}
