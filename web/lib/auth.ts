/** Starts GitHub OAuth — use for all “Sign in” CTAs (not /login). */
export const GITHUB_SIGN_IN_URL = '/api/auth/github';

export async function signOut(redirectTo = '/'): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.assign(redirectTo);
}

export function isGitHubUser(user: { isPublicGuest?: boolean } | null | undefined): boolean {
  return Boolean(user && !user.isPublicGuest);
}
