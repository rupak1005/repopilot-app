import { appOrigin } from './session';

export function githubAuthorizeUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID is not set');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appOrigin()}/api/auth/callback/github`,
    scope: 'read:user repo',
    state
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${appOrigin()}/api/auth/callback/github`
    })
  });

  if (!response.ok) {
    throw new Error('GitHub token exchange failed');
  }

  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!payload.access_token) {
    throw new Error(payload.error ?? 'Missing GitHub access token');
  }
  return payload.access_token;
}

export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
};

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) {
    throw new Error('Failed to load GitHub profile');
  }
  return (await response.json()) as GitHubUser;
}

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  owner: { login: string };
};

export async function fetchGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (page <= 5) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=100&sort=updated&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    if (!response.ok) {
      throw new Error('Failed to load GitHub repositories');
    }
    const batch = (await response.json()) as GitHubRepo[];
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos;
}
