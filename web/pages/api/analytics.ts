import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyApiRequest } from '../../lib/serverApi';

type EventBody = {
  name?: string;
  path?: string;
  properties?: Record<string, string | number | boolean | null>;
};

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = (req.body ?? {}) as EventBody;
  if (!body.name || !/^[a-z0-9_.-]{1,64}$/i.test(body.name)) {
    res.status(400).json({ error: 'Invalid event name' });
    return;
  }
  try {
    const response = await proxyApiRequest('/api/v1/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      res.status(204).end();
      return;
    }
  } catch {
    // Analytics must never block navigation or form submission.
  }
  res.status(204).end();
}
