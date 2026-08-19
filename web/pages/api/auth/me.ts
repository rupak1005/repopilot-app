import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession, toPublicUser } from '../../../lib/session';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.status(200).json(toPublicUser(session));
}
