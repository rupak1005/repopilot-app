import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

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

function gitAuthEnv(token?: string): NodeJS.ProcessEnv {
  if (!token) return process.env;
  const basic = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`
  };
}

function assertGitHubSlug(owner: string, name: string): void {
  if (!OWNER_RE.test(owner) || !REPO_RE.test(name)) {
    throw new Error('Invalid GitHub repository slug');
  }
}

/** Clone or fetch a GitHub repository using the user's OAuth token. */
export async function cloneOrUpdateRepository(args: {
  owner: string;
  name: string;
  accessToken: string;
}): Promise<CloneOrUpdateResult> {
  assertGitHubSlug(args.owner, args.name);
  const remote = `https://github.com/${args.owner}/${args.name}.git`;
  return cloneOrUpdateFromRemote({
    owner: args.owner,
    name: args.name,
    remote,
    token: args.accessToken
  });
}

/** Shallow clone of a public repository (optional GITHUB_TOKEN for rate limits). */
export async function clonePublicRepository(args: {
  owner: string;
  name: string;
}): Promise<CloneOrUpdateResult> {
  assertGitHubSlug(args.owner, args.name);
  const token = process.env.GITHUB_TOKEN?.trim();
  const remote = `https://github.com/${args.owner}/${args.name}.git`;
  return cloneOrUpdateFromRemote({
    owner: args.owner,
    name: args.name,
    remote,
    token
  });
}

async function cloneOrUpdateFromRemote(args: {
  owner: string;
  name: string;
  remote: string;
  token?: string;
}): Promise<CloneOrUpdateResult> {
  const root = cloneRoot();
  const repoPath = path.join(root, args.owner, args.name);
  await fs.mkdir(path.dirname(repoPath), { recursive: true });
  const env = gitAuthEnv(args.token);

  try {
    await fs.access(path.join(repoPath, '.git'));
    await execFileAsync('git', ['fetch', '--depth', '1', 'origin'], { cwd: repoPath, env });
    await execFileAsync('git', ['checkout', '-f', 'FETCH_HEAD'], { cwd: repoPath, env });
  } catch {
    await fs.rm(repoPath, { recursive: true, force: true }).catch(() => undefined);
    await execFileAsync('git', ['clone', '--depth', '1', '--', args.remote, repoPath], { env });
  }

  const revisionSha = await resolveHeadSha(repoPath);
  return { repoPath, revisionSha };
}
