type Bucket = { count: number; resetAt: number };

// ponytail: in-memory per-process limiter; upgrade to Redis for multi-instance deploy
const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: bucket.count <= limit,
    retryAfterSec
  };
}

export function clientIp(headers: Record<string, unknown>, fallback?: string): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || fallback || 'unknown';
  }
  return fallback || 'unknown';
}
