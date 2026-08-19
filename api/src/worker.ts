import 'dotenv/config';
import { getPrisma } from './db/prisma';
import { syncRepository } from './services/repositorySync';
import { runPullRequestReview } from './services/prReview';
import {
  isNonRetryableError,
  updateQueuedJobStatus
} from './services/jobLifecycle';
import { claimNextQueuedJob, MAX_JOB_ATTEMPTS } from './services/jobQueue';
import { getDefaultReviewPublisher } from './services/githubCheckPublisher';
import { ingestRepositoryHistory } from './services/historyIngest';
import type { PrReviewJobPayload, RepoSyncJobPayload } from './services/jobQueue';

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...fields }));
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadRepositoryMeta(repositoryId: string): Promise<{
  owner: string;
  name: string;
} | null> {
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      SELECT "owner", "name"
      FROM "Repository"
      WHERE "id" = $1
      LIMIT 1
    `,
    repositoryId
  )) as Array<{ owner: string; name: string }>;

  return rows[0] ?? null;
}

async function handleRepoSyncJob(jobId: string, payload: RepoSyncJobPayload, attempts: number) {
  const cloneRoot = process.env.REPO_CLONE_ROOT;
  if (!cloneRoot) {
    throw new Error('REPO_CLONE_ROOT is not configured for repository-sync jobs');
  }

  const meta = await loadRepositoryMeta(payload.repositoryId);
  if (!meta) {
    throw new Error(`repository not found: ${payload.repositoryId}`);
  }

  const repoPath = `${cloneRoot}/${meta.owner}/${meta.name}`;
  const startedAt = Date.now();
  logEvent('repo.sync.job.started', {
    queuedJobId: jobId,
    repositoryId: payload.repositoryId,
    revisionSha: payload.revisionSha,
    repoPath,
    attempts
  });

  await syncRepository({
    repositoryId: payload.repositoryId,
    repoPath,
    revisionSha: payload.revisionSha,
    owner: meta.owner,
    repositoryName: meta.name
  });

  try {
    await ingestRepositoryHistory({
      repositoryId: payload.repositoryId,
      repoPath
    });
  } catch (err) {
    logEvent('history.ingest.skipped', {
      repositoryId: payload.repositoryId,
      error: err instanceof Error ? err.message : String(err)
    });
  }

  await updateQueuedJobStatus({
    queuedJobId: jobId,
    status: 'COMPLETED',
    attempts,
    lastError: null
  });

  logEvent('repo.sync.job.completed', {
    queuedJobId: jobId,
    repositoryId: payload.repositoryId,
    revisionSha: payload.revisionSha,
    latencyMs: Date.now() - startedAt
  });
}

async function handlePrReviewJob(jobId: string, payload: PrReviewJobPayload, attempts: number) {
  const prisma = getPrisma();
  const prRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "headRevision"
      FROM "PullRequest"
      WHERE "id" = $1
      LIMIT 1
    `,
    payload.pullRequestId
  )) as Array<{ headRevision: string }>;
  const pullRequest = prRows[0];

  if (!pullRequest || pullRequest.headRevision !== payload.headSha) {
    await updateQueuedJobStatus({
      queuedJobId: jobId,
      status: 'STALE',
      attempts,
      lastError: 'Pull request head revision changed before review started'
    });
    logEvent('pr.review.stale', {
      queuedJobId: jobId,
      repositoryId: payload.repositoryId,
      pullNumber: payload.pullNumber,
      headSha: payload.headSha
    });
    return;
  }

  const startedAt = Date.now();
  logEvent('pr.review.started', {
    queuedJobId: jobId,
    repositoryId: payload.repositoryId,
    pullNumber: payload.pullNumber,
    headSha: payload.headSha,
    attempts
  });

  const review = await runPullRequestReview({
    repositoryId: payload.repositoryId,
    pullNumber: payload.pullNumber
  });

  const meta = await loadRepositoryMeta(payload.repositoryId);
  if (meta) {
    const publisher = getDefaultReviewPublisher();
    const published = await publisher.publishReview({
      owner: meta.owner,
      repo: meta.name,
      headSha: payload.headSha,
      outcome: review.outcome ?? 'INCOMPLETE',
      review,
      existingCheckRunId: review.checkRunId
    });

    if (published.checkRunId) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE "PullRequestReview"
          SET "checkRunId" = $2
          WHERE "id" = $1
        `,
        review.reviewId,
        published.checkRunId
      );
    }
  }

  await updateQueuedJobStatus({
    queuedJobId: jobId,
    status: 'COMPLETED',
    attempts,
    lastError: null
  });

  logEvent('pr.review.completed', {
    queuedJobId: jobId,
    repositoryId: payload.repositoryId,
    pullNumber: payload.pullNumber,
    headSha: payload.headSha,
    outcome: review.outcome,
    findings: review.findings.length,
    latencyMs: Date.now() - startedAt
  });
}

async function handleJobFailure(args: {
  jobId: string;
  attempts: number;
  err: unknown;
}) {
  const message = args.err instanceof Error ? args.err.message : String(args.err);
  const terminal =
    isNonRetryableError(args.err) || args.attempts >= MAX_JOB_ATTEMPTS;

  await updateQueuedJobStatus({
    queuedJobId: args.jobId,
    status: terminal ? 'DEAD_LETTER' : 'QUEUED',
    attempts: args.attempts,
    lastError: message
  });

  logEvent('job.failed', {
    queuedJobId: args.jobId,
    attempts: args.attempts,
    terminal,
    error: message
  });
}

async function processOnce() {
  const job = await claimNextQueuedJob();
  if (!job) return false;

  try {
    if (job.type === 'repo-sync') {
      await handleRepoSyncJob(job.id, job.payload as RepoSyncJobPayload, job.attempts);
    } else if (job.type === 'pr-review') {
      await handlePrReviewJob(job.id, job.payload as PrReviewJobPayload, job.attempts);
    } else {
      await updateQueuedJobStatus({
        queuedJobId: job.id,
        status: 'DEAD_LETTER',
        attempts: job.attempts,
        lastError: `Unknown job type: ${job.type}`
      });
    }
  } catch (err) {
    await handleJobFailure({
      jobId: job.id,
      attempts: job.attempts,
      err
    });
  }

  return true;
}

async function bootstrap() {
  logEvent('worker.started', { mode: 'db-polled-queue' });

  while (true) {
    const processed = await processOnce();
    if (!processed) {
      await sleep(Number(process.env.WORKER_POLL_MS ?? 2000));
    }
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
