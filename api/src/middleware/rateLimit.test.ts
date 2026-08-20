import { describe, expect, it } from 'vitest';
import { checkRateLimit, clientIp } from './rateLimit';

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
