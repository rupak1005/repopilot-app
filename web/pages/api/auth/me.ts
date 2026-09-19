import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession, toPublicUser } from '../../../lib/session';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const session = getSession(req);
  if (!session) {
    // Anonymous public pages probe this endpoint on every route. Returning a
    // successful empty result avoids treating the expected signed-out state as
    // a browser/network error in diagnostics and monitoring.
    res.status(200).json(null);
    return;
  }
  res.status(200).json(toPublicUser(session));
}
