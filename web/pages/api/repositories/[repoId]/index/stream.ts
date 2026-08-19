import type { NextApiRequest, NextApiResponse } from 'next';
import { API_ORIGIN, assertRepoSession, internalApiHeaders } from '../../../../../lib/serverApi';
import { getSession } from '../../../../../lib/session';

export const config = {
  api: {
    responseLimit: false,
    externalResolver: true
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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

  const upstream = await fetch(`${API_ORIGIN}/api/v1/repositories/${repoId}/index/stream`, {
    headers: internalApiHeaders({ Accept: 'text/event-stream' })
  });

  if (!upstream.ok || !upstream.body) {
    const payload = await upstream.text();
    res.status(upstream.status).send(payload || 'Stream unavailable');
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  req.on('close', () => {
    void reader.cancel();
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch {
    // client disconnected
  } finally {
    res.end();
  }
}
