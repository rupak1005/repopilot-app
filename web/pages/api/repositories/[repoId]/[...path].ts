import type { NextApiRequest, NextApiResponse } from 'next';
import {
  assertRepoSession,
  proxyApiRequest,
  repositoryProxySubpath
} from '../../../../lib/serverApi';
import { getSession } from '../../../../lib/session';

const ALLOWED_PREFIXES = [
  'pulls',
  'analytics',
  'hotspots',
  'architecture',
  'graph',
  'impact',
  'reviews',
  'search',
  'ask',
  'dependencies',
  'resolve-path',
  'revisions',
  'history',
  'co-change',
  'similar-changes',
  'symbols',
  'findings',
  'wiki',
  'ownership'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const repoId = typeof req.query.repoId === 'string' ? req.query.repoId : null;
  if (!repoId) {
    res.status(400).json({ error: 'repoId required' });
    return;
  }

  const session = getSession(req);
  if (!assertRepoSession(session, repoId)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // Never use req.query.path — it collides with ?path= for wiki/ownership.
  const subPath = repositoryProxySubpath(req.url, repoId);
  const head = subPath.split('/')[0] ?? '';
  if (!head || !ALLOWED_PREFIXES.includes(head)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const queryIndex = req.url?.indexOf('?') ?? -1;
  const queryString = queryIndex >= 0 ? req.url!.slice(queryIndex) : '';
  const apiPath = `/api/v1/repositories/${repoId}/${subPath}${queryString}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (secret) headers['x-repopilot-internal-key'] = secret;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
    init.body = JSON.stringify(req.body);
  }

  const response = await proxyApiRequest(apiPath, init);
  const contentType = response.headers.get('content-type') ?? '';
  res.status(response.status);
  if (contentType.includes('application/json')) {
    res.json(await response.json());
    return;
  }
  res.send(await response.text());
}
