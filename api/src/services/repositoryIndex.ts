import { randomUUID } from 'node:crypto';
import { getPrisma } from '../db/prisma';
import { ensureRepository } from '../repo/persistence';
import { buildDependencyGraph } from './dependencyGraphBuilder';
import { cloneOrUpdateRepository, clonePublicRepository } from './githubClone';
import { fetchRemoteHeadSha } from './githubPublic';
import { ingestRepositoryHistory } from './historyIngest';
import { syncRepository } from './repositorySync';
import {
  getRepositoryRevisionStatus,
  listRepositoryRevisions
} from './repositoryRevisions';

export type IndexJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';

/** Default: abandon RUNNING/QUEUED index jobs with no heartbeat (Render free can kill mid-pipeline). */
const DEFAULT_INDEX_JOB_STALE_MS = 20 * 60 * 1000;

export function indexJobStaleMs(): number {
  const raw = Number(process.env.INDEX_JOB_STALE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INDEX_JOB_STALE_MS;
}

export function indexJobLooksAbandoned(
  updatedAtIso: string,
  nowMs = Date.now(),
  staleMs = indexJobStaleMs()
): boolean {
  const updated = Date.parse(updatedAtIso);
  if (!Number.isFinite(updated)) return false;
  return nowMs - updated >= staleMs;
}

export type RepositoryIndexStatus = {
  repositoryId: string;
  state: 'not_indexed' | 'indexing' | 'ready' | 'failed';
  stage: 'clone' | 'parse' | 'graph' | 'history' | 'ready' | 'failed';
  revisionSha: string | null;
  /** Default-branch HEAD on GitHub when comparable; null if unknown/private. */
  remoteHeadSha: string | null;
  /** True when ready and indexed SHA ≠ remote HEAD. */
  stale: boolean;
  fileCount: number;
  symbolCount: number;
  moduleDependencyCount: number;
  job: {
    id: string;
    status: IndexJobStatus;
    lastError: string | null;
    updatedAt: string;
  } | null;
};

/** Pure compare for tests + status assembly. */
export function isIndexBehindRemote(
  state: RepositoryIndexStatus['state'],
  revisionSha: string | null,
  remoteHeadSha: string | null
): boolean {
  return state === 'ready' && !!revisionSha && !!remoteHeadSha && revisionSha !== remoteHeadSha;
}

// ponytail: process-local TTL cache — avoids GitHub on every SSE/poll tick; restart clears.
const REMOTE_HEAD_TTL_MS = 60_000;
const remoteHeadCache = new Map<string, { sha: string | null; at: number }>();

async function cachedRemoteHeadSha(owner: string, name: string): Promise<string | null> {
  const key = `${owner}/${name}`.toLowerCase();
  const hit = remoteHeadCache.get(key);
  if (hit && Date.now() - hit.at < REMOTE_HEAD_TTL_MS) return hit.sha;
  const sha = await fetchRemoteHeadSha({ owner, name });
  remoteHeadCache.set(key, { sha, at: Date.now() });
  return sha;
}

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...fields }));
}

function historyMaxCommits(): number {
  const raw = process.env.HISTORY_MAX_COMMITS;
  if (raw === '0' || raw === 'false') return 0;
  const parsed = Number(raw ?? 300);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 300;
}

async function enqueueRepositorySyncJob(args: {
  repositoryId: string;
  revisionSha: string;
}): Promise<string | null> {
  const deliveryId = randomUUID();
  const dedupeKey = `repo:${args.repositoryId}:index:${args.revisionSha}`;
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      INSERT INTO "QueuedJob" (
        "type",
        "repositoryId",
        "deliveryId",
        "dedupeKey",
        "payload"
      )
      VALUES ('repo-sync', $1, $2, $3, $4::jsonb)
      ON CONFLICT ("dedupeKey") DO UPDATE
        SET "status" = CASE
          WHEN "QueuedJob"."status" IN ('COMPLETED', 'FAILED', 'DEAD_LETTER') THEN 'QUEUED'
          ELSE "QueuedJob"."status"
        END,
        "updatedAt" = NOW()
      RETURNING "id"
    `,
    args.repositoryId,
    deliveryId,
    dedupeKey,
    JSON.stringify({
      repositoryId: args.repositoryId,
      revisionSha: args.revisionSha
    })
  )) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

async function latestIndexJob(repositoryId: string) {
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      SELECT "id", "status", "lastError", "updatedAt"
      FROM "QueuedJob"
      WHERE "repositoryId" = $1
        AND "type" = 'repo-sync'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `,
    repositoryId
  )) as Array<{
    id: string;
    status: IndexJobStatus;
    lastError: string | null;
    updatedAt: Date;
  }>;

  const job = rows[0];
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    lastError: job.lastError,
    updatedAt: job.updatedAt.toISOString()
  };
}

async function touchIndexJob(jobId: string): Promise<void> {
  await getPrisma().$executeRawUnsafe(
    `
      UPDATE "QueuedJob"
      SET "updatedAt" = NOW()
      WHERE "id" = $1
        AND "status" IN ('QUEUED', 'RUNNING')
    `,
    jobId
  );
}

async function abandonStaleIndexJob(job: {
  id: string;
  status: IndexJobStatus;
  lastError: string | null;
  updatedAt: string;
}): Promise<{
  id: string;
  status: IndexJobStatus;
  lastError: string | null;
  updatedAt: string;
}> {
  if (job.status !== 'QUEUED' && job.status !== 'RUNNING') return job;
  if (!indexJobLooksAbandoned(job.updatedAt)) return job;

  const lastError =
    'Index job timed out or the API process restarted mid-run. Re-index from Settings.';
  await getPrisma().$executeRawUnsafe(
    `
      UPDATE "QueuedJob"
      SET "status" = 'FAILED',
          "lastError" = $2,
          "updatedAt" = NOW()
      WHERE "id" = $1
        AND "status" IN ('QUEUED', 'RUNNING')
    `,
    job.id,
    lastError
  );
  return {
    ...job,
    status: 'FAILED',
    lastError,
    updatedAt: new Date().toISOString()
  };
}

async function beginIndexJob(args: {
  repositoryId: string;
  revisionSha: string;
}): Promise<string | null> {
  const deliveryId = randomUUID();
  const dedupeKey = `repo:${args.repositoryId}:index:${args.revisionSha}`;
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      INSERT INTO "QueuedJob" (
        "type",
        "repositoryId",
        "deliveryId",
        "dedupeKey",
        "payload",
        "status"
      )
      VALUES ('repo-sync', $1, $2, $3, $4::jsonb, 'RUNNING')
      ON CONFLICT ("dedupeKey") DO UPDATE
        SET "status" = 'RUNNING',
            "lastError" = NULL,
            "updatedAt" = NOW()
      RETURNING "id"
    `,
    args.repositoryId,
    deliveryId,
    dedupeKey,
    JSON.stringify({
      repositoryId: args.repositoryId,
      revisionSha: args.revisionSha
    })
  )) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

async function finishIndexJob(args: {
  repositoryId: string;
  revisionSha: string;
  status: 'COMPLETED' | 'FAILED';
  lastError?: string | null;
}): Promise<void> {
  await getPrisma().$queryRawUnsafe(
    `
      UPDATE "QueuedJob"
      SET "status" = $3,
          "lastError" = $4,
          "updatedAt" = NOW()
      WHERE "repositoryId" = $1
        AND "type" = 'repo-sync'
        AND "payload"->>'revisionSha' = $2
    `,
    args.repositoryId,
    args.revisionSha,
    args.status,
    args.lastError ?? null
  );
}

function deriveIndexStage(args: {
  state: RepositoryIndexStatus['state'];
  fileCount: number;
  symbolCount: number;
  moduleDependencyCount: number;
}): RepositoryIndexStatus['stage'] {
  if (args.state === 'failed') return 'failed';
  if (args.state === 'ready') return 'ready';
  if (args.state !== 'indexing') return 'clone';
  if (args.fileCount === 0) return 'clone';
  if (args.moduleDependencyCount === 0) {
    return args.symbolCount > 0 ? 'graph' : 'parse';
  }
  return 'history';
}

/** Full on-disk index: sync → graph → history (used by worker and inline fallback). */
export async function runFullRepositoryIndex(args: {
  repositoryId: string;
  repoPath: string;
  owner: string;
  name: string;
  revisionSha: string;
  /** Heartbeat so status polling does not mark a long run abandoned. */
  onStage?: (stage: 'parse' | 'graph' | 'history') => Promise<void>;
}): Promise<void> {
  logEvent('repo.index.pipeline.started', {
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });

  await syncRepository({
    repositoryId: args.repositoryId,
    repoPath: args.repoPath,
    revisionSha: args.revisionSha,
    owner: args.owner,
    repositoryName: args.name
  });
  await args.onStage?.('parse');

  await buildDependencyGraph({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  await args.onStage?.('graph');

  try {
    const maxCount = historyMaxCommits();
    if (maxCount > 0) {
      await args.onStage?.('history');
      await ingestRepositoryHistory({
        repositoryId: args.repositoryId,
        repoPath: args.repoPath,
        maxCount
      });
    } else {
      logEvent('repo.index.history.skipped', {
        repositoryId: args.repositoryId,
        reason: 'HISTORY_MAX_COMMITS=0'
      });
    }
  } catch (err) {
    logEvent('repo.index.history.skipped', {
      repositoryId: args.repositoryId,
      error: err instanceof Error ? err.message : String(err)
    });
  }

  logEvent('repo.index.pipeline.completed', {
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
}

async function runFullRepositoryIndexWithJob(args: {
  repositoryId: string;
  repoPath: string;
  owner: string;
  name: string;
  revisionSha: string;
}): Promise<void> {
  const jobId = await beginIndexJob({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });

  try {
    await runFullRepositoryIndex({
      ...args,
      onStage: jobId
        ? async () => {
            await touchIndexJob(jobId);
          }
        : undefined
    });
    await finishIndexJob({
      repositoryId: args.repositoryId,
      revisionSha: args.revisionSha,
      status: 'COMPLETED'
    });
  } catch (err) {
    await finishIndexJob({
      repositoryId: args.repositoryId,
      revisionSha: args.revisionSha,
      status: 'FAILED',
      lastError: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

export async function rebuildRepositoryGraph(
  repositoryId: string
): Promise<{ revisionSha: string }> {
  const revisions = await listRepositoryRevisions(repositoryId);
  const latest = revisions[0];
  if (!latest) {
    throw new Error('Repository is not indexed yet');
  }

  await buildDependencyGraph({
    repositoryId,
    revisionSha: latest.revisionSha
  });

  logEvent('repo.graph.rebuilt', {
    repositoryId,
    revisionSha: latest.revisionSha
  });

  return { revisionSha: latest.revisionSha };
}

export async function startRepositoryIndex(args: {
  repositoryId: string;
  owner: string;
  name: string;
  accessToken: string;
  inline?: boolean;
}): Promise<{ queuedJobId: string | null; revisionSha: string }> {
  await ensureRepository({
    repositoryId: args.repositoryId,
    name: args.name,
    owner: args.owner
  });

  const { repoPath, revisionSha } = await cloneOrUpdateRepository({
    owner: args.owner,
    name: args.name,
    accessToken: args.accessToken
  });

  // Server INDEX_INLINE wins — clients must not force Redis queue on workerless deploys.
  const inline = process.env.INDEX_INLINE === 'true' || args.inline === true;

  if (inline) {
    await runFullRepositoryIndexWithJob({
      repositoryId: args.repositoryId,
      repoPath,
      owner: args.owner,
      name: args.name,
      revisionSha
    });
    return { queuedJobId: null, revisionSha };
  }

  const queuedJobId = await enqueueRepositorySyncJob({
    repositoryId: args.repositoryId,
    revisionSha
  });

  logEvent('repo.index.enqueued', {
    repositoryId: args.repositoryId,
    revisionSha,
    queuedJobId
  });

  return { queuedJobId, revisionSha };
}

export async function startPublicRepositoryIndex(args: {
  repositoryId: string;
  owner: string;
  name: string;
  inline?: boolean;
  background?: boolean;
}): Promise<{ queuedJobId: string | null; revisionSha: string; indexing?: boolean }> {
  await ensureRepository({
    repositoryId: args.repositoryId,
    name: args.name,
    owner: args.owner
  });

  const { repoPath, revisionSha } = await clonePublicRepository({
    owner: args.owner,
    name: args.name
  });

  const background = args.background ?? false;
  // Server INDEX_INLINE wins — same as authenticated index path.
  const inline = !background && (process.env.INDEX_INLINE === 'true' || args.inline === true);
  const pipelineArgs = {
    repositoryId: args.repositoryId,
    repoPath,
    owner: args.owner,
    name: args.name,
    revisionSha
  };

  if (background) {
    await beginIndexJob({
      repositoryId: args.repositoryId,
      revisionSha
    });
    void runFullRepositoryIndexWithJob(pipelineArgs).catch((err) => {
      logEvent('repo.index.public.background.failed', {
        repositoryId: args.repositoryId,
        revisionSha,
        error: err instanceof Error ? err.message : String(err)
      });
    });
    return { queuedJobId: null, revisionSha, indexing: true };
  }

  if (inline) {
    await runFullRepositoryIndexWithJob(pipelineArgs);
    return { queuedJobId: null, revisionSha };
  }

  const queuedJobId = await enqueueRepositorySyncJob({
    repositoryId: args.repositoryId,
    revisionSha
  });

  logEvent('repo.index.public.enqueued', {
    repositoryId: args.repositoryId,
    revisionSha,
    queuedJobId
  });

  return { queuedJobId, revisionSha };
}

export async function getRepositoryIndexStatus(
  repositoryId: string
): Promise<RepositoryIndexStatus> {
  let job = await latestIndexJob(repositoryId);
  if (job) job = await abandonStaleIndexJob(job);
  const revisions = await listRepositoryRevisions(repositoryId);
  const latestRevision = revisions[0] ?? null;

  let fileCount = 0;
  let symbolCount = 0;
  let moduleDependencyCount = 0;

  if (latestRevision) {
    const detail = await getRepositoryRevisionStatus({
      repositoryId,
      revisionSha: latestRevision.revisionSha
    });
    if (detail) {
      fileCount = detail.fileCount;
      symbolCount = detail.symbolCount;
      moduleDependencyCount = detail.moduleDependencyCount;
    }
  }

  let state: RepositoryIndexStatus['state'] = 'not_indexed';
  if (job?.status === 'QUEUED' || job?.status === 'RUNNING') {
    state = 'indexing';
  } else if (job?.status === 'FAILED' || job?.status === 'DEAD_LETTER') {
    state = fileCount > 0 ? 'ready' : 'failed';
  } else if (fileCount > 0) {
    state = 'ready';
  }

  const stage = deriveIndexStage({ state, fileCount, symbolCount, moduleDependencyCount });
  const revisionSha = latestRevision?.revisionSha ?? null;

  let remoteHeadSha: string | null = null;
  if (state === 'ready' && revisionSha) {
    const repo = await getPrisma().repository.findUnique({
      where: { id: repositoryId },
      select: { owner: true, name: true }
    });
    if (repo?.owner && repo?.name) {
      remoteHeadSha = await cachedRemoteHeadSha(repo.owner, repo.name);
    }
  }

  return {
    repositoryId,
    state,
    stage,
    revisionSha,
    remoteHeadSha,
    stale: isIndexBehindRemote(state, revisionSha, remoteHeadSha),
    fileCount,
    symbolCount,
    moduleDependencyCount,
    job
  };
}
