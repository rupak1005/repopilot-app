import { randomUUID } from 'node:crypto';
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Git writes packfiles into the checkout while cloning. Never let two jobs
 * mutate the same checkout at once: a second job can remove the directory
 * while the first Git process is still writing its temporary packfile.
 */
async function acquireRepositoryLock(lockPath: string): Promise<() => Promise<void>> {
  const staleAfterMs = 15 * 60 * 1000;
  const deadline = Date.now() + staleAfterMs;

  while (Date.now() < deadline) {
    try {
      await fs.mkdir(lockPath);
      await fs.writeFile(
        path.join(lockPath, 'owner'),
        `${process.pid}\n${new Date().toISOString()}\n`,
        'utf8'
      );
      return async () => {
        await fs.rm(lockPath, { recursive: true, force: true }).catch(() => undefined);
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;

      try {
        const stat = await fs.stat(lockPath);
        let ownerAlive = true;
        try {
          const owner = await fs.readFile(path.join(lockPath, 'owner'), 'utf8');
          const ownerPid = Number(owner.split('\n')[0]?.trim());
          if (Number.isInteger(ownerPid) && ownerPid > 0 && ownerPid !== process.pid) {
            try {
              process.kill(ownerPid, 0);
            } catch (processError) {
              ownerAlive = (processError as NodeJS.ErrnoException).code !== 'ESRCH';
            }
          }
        } catch {
          // A lock created moments ago may not have its owner marker yet.
        }
        if (!ownerAlive || Date.now() - stat.mtimeMs > staleAfterMs) {
          await fs.rm(lockPath, { recursive: true, force: true });
          continue;
        }
      } catch {
        // The owner released the lock between mkdir/stat; retry immediately.
      }
      await sleep(250);
    }
  }

  throw new Error('Timed out waiting for another repository acquisition to finish');
}

async function hasUsableCheckout(repoPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(repoPath, '.git'));
    await resolveHeadSha(repoPath);
    return true;
  } catch {
    return false;
  }
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
  const releaseLock = await acquireRepositoryLock(`${repoPath}.lock`);
  const stagingPath = `${repoPath}.partial-${process.pid}-${randomUUID()}`;
  const backupPath = `${repoPath}.previous-${process.pid}-${randomUUID()}`;

  try {
    if (await hasUsableCheckout(repoPath)) {
      try {
        await execFileAsync('git', ['fetch', '--depth', '1', 'origin'], { cwd: repoPath, env });
        await execFileAsync('git', ['checkout', '-f', 'FETCH_HEAD'], { cwd: repoPath, env });
        const revisionSha = await resolveHeadSha(repoPath);
        return { repoPath, revisionSha };
      } catch {
        // Preserve the last checkout and replace it only after a clean clone
        // succeeds below. A transient fetch failure must not destroy data.
        console.warn(
          JSON.stringify({
            event: 'repo.clone.refresh_failed',
            owner: args.owner,
            name: args.name
          })
        );
      }
    }

    await fs.rm(stagingPath, { recursive: true, force: true });
    await execFileAsync('git', ['clone', '--depth', '1', '--', args.remote, stagingPath], { env });
    const revisionSha = await resolveHeadSha(stagingPath);

    // Swap only complete repositories into place. This prevents readers from
    // ever seeing a half-written .git/objects directory.
    let movedExisting = false;
    try {
      if (await fs.stat(repoPath).then(() => true).catch(() => false)) {
        await fs.rm(backupPath, { recursive: true, force: true });
        await fs.rename(repoPath, backupPath);
        movedExisting = true;
      }
      await fs.rename(stagingPath, repoPath);
      if (movedExisting) await fs.rm(backupPath, { recursive: true, force: true });
    } catch (err) {
      if (movedExisting) {
        await fs.rename(backupPath, repoPath).catch(() => undefined);
      }
      throw err;
    }

    return { repoPath, revisionSha };
  } finally {
    await fs.rm(stagingPath, { recursive: true, force: true }).catch(() => undefined);
    await fs.rm(backupPath, { recursive: true, force: true }).catch(() => undefined);
    await releaseLock();
  }
}
