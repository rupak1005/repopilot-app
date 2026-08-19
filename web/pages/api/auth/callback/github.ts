import type { NextApiRequest, NextApiResponse } from 'next';
import { exchangeGitHubCode, fetchGitHubUser } from '../../../../lib/github';
import {
  clearOAuthStateCookie,
  readOAuthState,
  setSessionCookie
} from '../../../../lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { code, state, error } = req.query;
  if (typeof error === 'string') {
    res.redirect(302, `/login?error=${encodeURIComponent(error)}`);
    return;
  }
  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).json({ error: 'Missing OAuth parameters' });
    return;
  }

  const expectedState = readOAuthState(req);
  clearOAuthStateCookie(res);
  if (!expectedState || expectedState !== state) {
    res.redirect(302, '/login?error=invalid_state');
    return;
  }

  try {
    const accessToken = await exchangeGitHubCode(code);
    const user = await fetchGitHubUser(accessToken);
    setSessionCookie(res, {
      githubId: user.id,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      accessToken
    });
    res.redirect(302, '/repos');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth failed';
    res.redirect(302, `/login?error=${encodeURIComponent(message)}`);
  }
}
