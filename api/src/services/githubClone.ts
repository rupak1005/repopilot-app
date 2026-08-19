import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type CloneOrUpdateResult = {
  repoPath: string;
  revisionSha: string;
};

function cloneRoot(): string {
  const root = process.env.REPO_CLONE_ROOT;
  if (!root) {
    throw new Error('REPO_CLONE_ROOT is not configured');
  }
  return root;
}

async function resolveHeadSha(repoPath: string): Promise<string> {
  const result = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoPath });
  const sha = result.stdout.trim();
  if (!sha) throw new Error('Could not resolve HEAD after clone');
  return sha;
}

/** Clone or fetch a GitHub repository using the user's OAuth token. */
export async function cloneOrUpdateRepository(args: {
  owner: string;
  name: string;
  accessToken: string;
}): Promise<CloneOrUpdateResult> {
  const remote = `https://x-access-token:${args.accessToken}@github.com/${args.owner}/${args.name}.git`;
  return cloneOrUpdateFromRemote({
    owner: args.owner,
    name: args.name,
    remote
  });
}

/** Shallow clone of a public repository (optional GITHUB_TOKEN for rate limits). */
export async function clonePublicRepository(args: {
  owner: string;
  name: string;
}): Promise<CloneOrUpdateResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const remote = token
    ? `https://x-access-token:${token}@github.com/${args.owner}/${args.name}.git`
    : `https://github.com/${args.owner}/${args.name}.git`;
  return cloneOrUpdateFromRemote({
    owner: args.owner,
    name: args.name,
    remote
  });
}

async function cloneOrUpdateFromRemote(args: {
  owner: string;
  name: string;
  remote: string;
}): Promise<CloneOrUpdateResult> {
  const root = cloneRoot();
  const repoPath = path.join(root, args.owner, args.name);
  await fs.mkdir(path.dirname(repoPath), { recursive: true });

  try {
    await fs.access(path.join(repoPath, '.git'));
    await execFileAsync('git', ['fetch', '--depth', '1', 'origin'], { cwd: repoPath });
    await execFileAsync('git', ['checkout', '-f', 'FETCH_HEAD'], { cwd: repoPath });
  } catch {
    await fs.rm(repoPath, { recursive: true, force: true }).catch(() => undefined);
    await execFileAsync(
      'git',
      ['clone', '--depth', '1', args.remote, repoPath],
      { env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }
    );
  }

  const revisionSha = await resolveHeadSha(repoPath);
  return { repoPath, revisionSha };
}
