import type { NextApiRequest, NextApiResponse } from 'next';
import { deriveRepositoryId, parseGithubRepoUrl } from '@repopilot/common';
import { isDemoMode } from '../../../lib/demoMode';
import { checkRateLimit } from '../../../lib/rateLimit';
import { proxyApiRequest } from '../../../lib/serverApi';
import { createPublicGuestSession, getSession, setSessionCookie } from '../../../lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (isDemoMode()) {
    const parsed = parseGithubRepoUrl((req.body as { url?: string })?.url ?? 'repopilot/demo');
    const fullName = parsed ? `${parsed.owner}/${parsed.name}` : 'repopilot/demo';
    const repositoryId = deriveRepositoryId(fullName);
    setSessionCookie(
      res,
      createPublicGuestSession({ fullName, repositoryId })
    );
    res.status(200).json({ repositoryId, fullName, revisionSha: 'demo', demo: true });
    return;
  }

  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
      : null) ||
    req.socket.remoteAddress ||
    'unknown';
  const limit = checkRateLimit(`public-open:${ip}`, 12, 60 * 60 * 1000);
  if (!limit.allowed) {
    res.status(429).json({
      error: `Too many repositories opened from this address. Try again in ${limit.retryAfterSec}s.`
    });
    return;
  }

  const body = req.body as { url?: string };
  const parsed = parseGithubRepoUrl(body.url ?? '');
  if (!parsed) {
    res.status(400).json({ error: 'Paste a public GitHub URL or owner/repo slug.' });
    return;
  }

  const existing = getSession(req);
  if (existing?.accessToken && !existing.isPublicGuest) {
    res.status(409).json({ error: 'Already signed in — use the repository picker instead.' });
    return;
  }

  const response = await proxyApiRequest('/api/v1/public/repositories/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner: parsed.owner,
      name: parsed.name,
      background: true
    })
  });

  const payload = (await response.json()) as {
    error?: string;
    repositoryId?: string;
    fullName?: string;
    revisionSha?: string;
    indexing?: boolean;
  };

  if (!response.ok || !payload.repositoryId || !payload.fullName) {
    res.status(response.status).json({
      error: payload.error ?? 'Could not open public repository'
    });
    return;
  }

  setSessionCookie(
    res,
    createPublicGuestSession({
      fullName: payload.fullName,
      repositoryId: payload.repositoryId
    })
  );

  res.status(200).json({
    repositoryId: payload.repositoryId,
    fullName: payload.fullName,
    revisionSha: payload.revisionSha,
    indexing: payload.indexing ?? false
  });
}
