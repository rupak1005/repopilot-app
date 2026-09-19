import type Redis from 'ioredis';
import { describe, expect, it, vi } from 'vitest';
import { checkDistributedRateLimit, checkRateLimit, clientIp } from './rateLimit';

describe('checkRateLimit', () => {
  it('allows requests within the limit', () => {
    const key = `test-${Date.now()}-allow`;
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
  });

  it('blocks after the limit is exceeded', () => {
    const key = `test-${Date.now()}-block`;
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(false);
  });
});

describe('clientIp', () => {
  it('prefers x-forwarded-for', () => {
    expect(clientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, '9.9.9.9')).toBe('1.2.3.4');
  });

  it('falls back to request ip', () => {
    expect(clientIp({}, '127.0.0.1')).toBe('127.0.0.1');
  });
});

describe('checkDistributedRateLimit', () => {
  it('sets the window on the first request and blocks after the limit', async () => {
    const redis = {
      incr: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(3),
      pexpire: vi.fn().mockResolvedValue(1),
      pttl: vi.fn().mockResolvedValue(1_499)
    } as unknown as Redis;

    const first = await checkDistributedRateLimit(redis, 'public-open:test', 2, 60_000);
    const blocked = await checkDistributedRateLimit(redis, 'public-open:test', 2, 60_000);

    expect(first).toEqual({ allowed: true, retryAfterSec: 2 });
    expect(blocked).toEqual({ allowed: false, retryAfterSec: 2 });
    expect(redis.incr).toHaveBeenCalledWith('repopilot:ratelimit:public-open:test');
    expect(redis.pexpire).toHaveBeenCalledOnce();
    expect(redis.pttl).toHaveBeenCalledTimes(2);
  });
});
