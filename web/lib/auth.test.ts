import { describe, expect, it } from 'vitest';
import { GITHUB_SIGN_IN_URL, isGitHubUser } from './auth';

describe('auth helpers', () => {
  it('uses GitHub OAuth endpoint for sign-in', () => {
    expect(GITHUB_SIGN_IN_URL).toBe('/api/auth/github');
  });

  it('distinguishes GitHub users from public guests', () => {
    expect(isGitHubUser(null)).toBe(false);
    expect(isGitHubUser({ isPublicGuest: true })).toBe(false);
    expect(isGitHubUser({ isPublicGuest: false })).toBe(true);
  });
});
