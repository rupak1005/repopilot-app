import { describe, expect, it } from 'vitest';
import { apiUnreachableMessage, parseJsonResponse } from './parseJsonResponse';

describe('parseJsonResponse', () => {
  it('parses JSON bodies', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    await expect(parseJsonResponse<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });

  it('returns null for empty bodies', async () => {
    const response = new Response('', { status: 200 });
    await expect(parseJsonResponse(response)).resolves.toBeNull();
  });

  it('returns null for invalid JSON', async () => {
    const response = new Response('<html>error</html>', {
      headers: { 'Content-Type': 'text/html' }
    });
    await expect(parseJsonResponse(response)).resolves.toBeNull();
  });
});

describe('apiUnreachableMessage', () => {
  it('mentions port 3001', () => {
    expect(apiUnreachableMessage()).toContain('3001');
  });
});
