import type { FastifyRequest, FastifyReply } from 'fastify';

/** Require INTERNAL_API_SECRET on /api/v1 in production; optional in local/test. */
export function requireInternalApiAuth(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (!isProd) return true;
    reply.code(503);
    void reply.send({ error: 'INTERNAL_API_SECRET is required in production' });
    return false;
  }

  const header = request.headers['x-repopilot-internal-key'];
  const provided = Array.isArray(header) ? header[0] : header;

  if (provided !== secret) {
    reply.code(401);
    void reply.send({ error: 'Unauthorized' });
    return false;
  }

  return true;
}
