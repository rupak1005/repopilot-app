import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSessionCookie } from '../../../lib/session';

export default function handler(_req: NextApiRequest, res: NextApiResponse): void {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
