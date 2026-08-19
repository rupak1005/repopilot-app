import type { FastifyRequest, FastifyReply } from 'fastify';

/** When INTERNAL_API_SECRET is set, require it on /api/v1 routes (web BFF). */
export function requireInternalApiAuth(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) return true;

  const header = request.headers['x-repopilot-internal-key'];
  const provided = Array.isArray(header) ? header[0] : header;

  if (provided !== secret) {
    reply.code(401);
    void reply.send({ error: 'Unauthorized' });
    return false;
  }

  return true;
}
