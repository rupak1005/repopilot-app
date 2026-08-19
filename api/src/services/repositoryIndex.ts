import { randomUUID } from 'node:crypto';
import { getPrisma } from '../db/prisma';
import { ensureRepository } from '../repo/persistence';
import { buildDependencyGraph } from './dependencyGraphBuilder';
import { cloneOrUpdateRepository, clonePublicRepository } from './githubClone';
import { ingestRepositoryHistory } from './historyIngest';
import { syncRepository } from './repositorySync';
import {
  getRepositoryRevisionStatus,
  listRepositoryRevisions
} from './repositoryRevisions';

export type IndexJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';

export type RepositoryIndexStatus = {
  repositoryId: string;
  state: 'not_indexed' | 'indexing' | 'ready' | 'failed';
  revisionSha: string | null;
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

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...fields }));
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

/** Full on-disk index: sync → graph → history (used by worker and inline fallback). */
export async function runFullRepositoryIndex(args: {
  repositoryId: string;
  repoPath: string;
  owner: string;
  name: string;
  revisionSha: string;
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

  await buildDependencyGraph({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });

  try {
    await ingestRepositoryHistory({
      repositoryId: args.repositoryId,
      repoPath: args.repoPath
    });
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

  const inline = args.inline ?? process.env.INDEX_INLINE === 'true';

  if (inline) {
    await runFullRepositoryIndex({
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
}): Promise<{ queuedJobId: string | null; revisionSha: string }> {
  await ensureRepository({
    repositoryId: args.repositoryId,
    name: args.name,
    owner: args.owner
  });

  const { repoPath, revisionSha } = await clonePublicRepository({
    owner: args.owner,
    name: args.name
  });

  const inline = args.inline ?? process.env.INDEX_INLINE === 'true';

  if (inline) {
    await runFullRepositoryIndex({
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
  const job = await latestIndexJob(repositoryId);
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

  return {
    repositoryId,
    state,
    revisionSha: latestRevision?.revisionSha ?? null,
    fileCount,
    symbolCount,
    moduleDependencyCount,
    job
  };
}
