import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyApiRequest } from '../../../lib/serverApi';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const params = new URLSearchParams();
  for (const key of ['q', 'sort', 'minStars', 'page'] as const) {
    const value = req.query[key];
    if (typeof value === 'string' && value.trim()) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  const response = await proxyApiRequest(
    `/api/v1/public/repositories/browse${query ? `?${query}` : ''}`
  );
  const payload = await response.json();
  res.status(response.status).json(payload);
}
