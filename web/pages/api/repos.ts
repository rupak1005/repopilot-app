import { deriveRepositoryId } from '@repopilot/common';
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchGitHubRepos } from '../../lib/github';
import { getSession, setSessionCookie } from '../../lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const repos = await fetchGitHubRepos(session.accessToken);
      res.status(200).json(
        repos.map((repo) => ({
          id: deriveRepositoryId(repo.full_name),
          fullName: repo.full_name,
          name: repo.name,
          owner: repo.owner.login,
          private: repo.private,
          description: repo.description,
          updatedAt: repo.updated_at
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load repositories';
      res.status(502).json({ error: message });
    }
    return;
  }

  if (req.method === 'POST') {
    const { fullName } = req.body as { fullName?: string };
    if (!fullName?.includes('/')) {
      res.status(400).json({ error: 'fullName required (owner/repo)' });
      return;
    }
    session.selectedRepoFullName = fullName;
    const repoId = deriveRepositoryId(fullName);
    session.selectedRepoId = repoId;
    setSessionCookie(res, session);
    res.status(200).json({
      id: repoId,
      fullName
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
