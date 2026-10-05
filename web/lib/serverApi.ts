import { deriveRepositoryId } from '@repopilot/common';
import type { SessionData } from './session';

export const API_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Resolve the private server-to-server API origin.
 *
 * The browser always talks to the Next.js BFF. In production the BFF must be
 * configured explicitly; falling back to localhost makes a deployed request
 * point back at the Vercel runtime and produces a misleading connection error.
 */
export function getApiOrigin(): string {
  const configured = process.env.REPOPILOT_API_URL?.trim() || process.env.API_URL?.trim();
  const legacy = process.env.NEXT_PUBLIC_API_URL?.trim();
  const origin = configured || (process.env.NODE_ENV === 'production' ? '' : legacy);

  if (!origin) {
    throw new Error(
      'RepoPilot API is not configured. Set REPOPILOT_API_URL on the web deployment.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('REPOPILOT_API_URL must be an absolute http(s) URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('REPOPILOT_API_URL must use http or https.');
  }

  if (process.env.NODE_ENV === 'production' && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(parsed.hostname)) {
    throw new Error('REPOPILOT_API_URL cannot point to localhost in production.');
  }

  return parsed.origin;
}

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
  if (!session?.selectedRepoId || !session.selectedRepoFullName) return false;
  if (session.selectedRepoId !== repoId) return false;
  return deriveRepositoryId(session.selectedRepoFullName) === repoId;
}

export async function proxyApiRequest(
  apiPath: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${getApiOrigin()}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  const headers = internalApiHeaders(init?.headers);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, headers, signal: init?.signal ?? controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
