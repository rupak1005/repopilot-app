import type { NextApiRequest, NextApiResponse } from 'next';
import { isDemoMode } from '../../../../../lib/demoMode';
import { assertRepoSession, proxyApiRequest } from '../../../../../lib/serverApi';
import { getSession } from '../../../../../lib/session';
import { parseRepoSlug } from '../../../../../lib/types';

/**
 * Lives at `index/index.ts` (not sibling `index.ts`) so Next maps this to
 * `/api/repositories/:repoId/index`. A sibling `index.ts` would bind `:repoId` itself
 * and leave `/index` to the catch-all → `{ error: 'Not found' }`.
 */
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

  if (req.method === 'GET') {
    const response = await proxyApiRequest(`/api/v1/repositories/${repoId}/index/status`);
    const payload = await response.json();
    res.status(response.status).json(payload);
    return;
  }

  if (req.method === 'POST') {
    if (isDemoMode()) {
      res.status(200).json({ queuedJobId: null, revisionSha: 'demo', skipped: true });
      return;
    }

    const fullName = session.selectedRepoFullName;
    if (!fullName) {
      res.status(400).json({ error: 'No repository selected' });
      return;
    }

    const { owner, name } = parseRepoSlug(fullName);

    if (session.isPublicGuest) {
      const response = await proxyApiRequest('/api/v1/public/repositories/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Omit inline — API INDEX_INLINE decides (Vercel must not force false → Redis queue with no worker).
        body: JSON.stringify({
          owner,
          name,
          background: true
        })
      });
      const payload = await response.json();
      res.status(response.status).json(payload);
      return;
    }

    if (!session.accessToken) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }

    const response = await proxyApiRequest(`/api/v1/repositories/${repoId}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner,
        name,
        accessToken: session.accessToken
      })
    });

    const payload = await response.json();
    res.status(response.status).json(payload);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
