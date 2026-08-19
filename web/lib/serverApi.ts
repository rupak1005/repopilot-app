import type { NextApiRequest } from 'next';
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

export function readJsonBody<T>(req: NextApiRequest): T {
  return req.body as T;
}
