import { afterEach, describe, expect, it } from 'vitest';
import { isDemoMode } from './demoMode';

describe('isDemoMode', () => {
  const original = process.env.NEXT_PUBLIC_DEMO_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
    else process.env.NEXT_PUBLIC_DEMO_MODE = original;
  });

  it('is true when env flag is true', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    expect(isDemoMode()).toBe(true);
  });

  it('is false otherwise', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    expect(isDemoMode()).toBe(false);
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    expect(isDemoMode()).toBe(false);
  });
});
