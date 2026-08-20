import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireInternalApiAuth } from './internalAuth';

function mockReply() {
  const reply = {
    statusCode: 200,
    body: undefined as unknown,
    code(status: number) {
      this.statusCode = status;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return Promise.resolve(undefined);
    }
  };
  return reply;
}

describe('requireInternalApiAuth', () => {
  const original = process.env.INTERNAL_API_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.INTERNAL_API_SECRET;
    else process.env.INTERNAL_API_SECRET = original;
  });

  it('allows requests when secret is unset', () => {
    delete process.env.INTERNAL_API_SECRET;
    const reply = mockReply();
    expect(requireInternalApiAuth({ headers: {} } as never, reply as never)).toBe(true);
    expect(reply.statusCode).toBe(200);
  });

  it('rejects missing header when secret is set', () => {
    process.env.INTERNAL_API_SECRET = 'test-secret';
    const reply = mockReply();
    expect(requireInternalApiAuth({ headers: {} } as never, reply as never)).toBe(false);
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toEqual({ error: 'Unauthorized' });
  });

  it('accepts matching header', () => {
    process.env.INTERNAL_API_SECRET = 'test-secret';
    const reply = mockReply();
    const allowed = requireInternalApiAuth(
      { headers: { 'x-repopilot-internal-key': 'test-secret' } } as never,
      reply as never
    );
    expect(allowed).toBe(true);
    expect(reply.statusCode).toBe(200);
  });
});
