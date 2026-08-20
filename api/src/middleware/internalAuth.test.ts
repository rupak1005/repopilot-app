import { afterEach, describe, expect, it } from 'vitest';
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
  const originalSecret = process.env.INTERNAL_API_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.INTERNAL_API_SECRET;
    else process.env.INTERNAL_API_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('allows requests when secret is unset outside production', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.INTERNAL_API_SECRET;
    const reply = mockReply();
    expect(requireInternalApiAuth({ headers: {} } as never, reply as never)).toBe(true);
    expect(reply.statusCode).toBe(200);
  });

  it('rejects when secret is unset in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.INTERNAL_API_SECRET;
    const reply = mockReply();
    expect(requireInternalApiAuth({ headers: {} } as never, reply as never)).toBe(false);
    expect(reply.statusCode).toBe(503);
    expect(reply.body).toEqual({ error: 'INTERNAL_API_SECRET is required in production' });
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
