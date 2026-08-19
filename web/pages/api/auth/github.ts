import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { githubAuthorizeUrl } from '../../../lib/github';
import { setOAuthStateCookie } from '../../../lib/session';

export default function handler(_req: NextApiRequest, res: NextApiResponse): void {
  const state = crypto.randomBytes(16).toString('hex');
  setOAuthStateCookie(res, state);
  res.redirect(302, githubAuthorizeUrl(state));
}
