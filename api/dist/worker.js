"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./db/prisma");
const repositorySync_1 = require("./services/repositorySync");
const prReview_1 = require("./services/prReview");
const jobLifecycle_1 = require("./services/jobLifecycle");
const jobQueue_1 = require("./services/jobQueue");
const githubCheckPublisher_1 = require("./services/githubCheckPublisher");
const historyIngest_1 = require("./services/historyIngest");
function logEvent(event, fields) {
    console.log(JSON.stringify({ event, ...fields }));
}
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function loadRepositoryMeta(repositoryId) {
    const rows = (await (0, prisma_1.getPrisma)().$queryRawUnsafe(`
      SELECT "owner", "name"
      FROM "Repository"
      WHERE "id" = $1
      LIMIT 1
    `, repositoryId));
    return rows[0] ?? null;
}
async function handleRepoSyncJob(jobId, payload, attempts) {
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
    await (0, repositorySync_1.syncRepository)({
        repositoryId: payload.repositoryId,
        repoPath,
        revisionSha: payload.revisionSha,
        owner: meta.owner,
        repositoryName: meta.name
    });
    try {
        await (0, historyIngest_1.ingestRepositoryHistory)({
            repositoryId: payload.repositoryId,
            repoPath
        });
    }
    catch (err) {
        logEvent('history.ingest.skipped', {
            repositoryId: payload.repositoryId,
            error: err instanceof Error ? err.message : String(err)
        });
    }
    await (0, jobLifecycle_1.updateQueuedJobStatus)({
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
async function handlePrReviewJob(jobId, payload, attempts) {
    const prisma = (0, prisma_1.getPrisma)();
    const prRows = (await prisma.$queryRawUnsafe(`
      SELECT "headRevision"
      FROM "PullRequest"
      WHERE "id" = $1
      LIMIT 1
    `, payload.pullRequestId));
    const pullRequest = prRows[0];
    if (!pullRequest || pullRequest.headRevision !== payload.headSha) {
        await (0, jobLifecycle_1.updateQueuedJobStatus)({
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
    const review = await (0, prReview_1.runPullRequestReview)({
        repositoryId: payload.repositoryId,
        pullNumber: payload.pullNumber
    });
    const meta = await loadRepositoryMeta(payload.repositoryId);
    if (meta) {
        const publisher = (0, githubCheckPublisher_1.getDefaultReviewPublisher)();
        const published = await publisher.publishReview({
            owner: meta.owner,
            repo: meta.name,
            headSha: payload.headSha,
            outcome: review.outcome ?? 'INCOMPLETE',
            review,
            existingCheckRunId: review.checkRunId
        });
        if (published.checkRunId) {
            await prisma.$executeRawUnsafe(`
          UPDATE "PullRequestReview"
          SET "checkRunId" = $2
          WHERE "id" = $1
        `, review.reviewId, published.checkRunId);
        }
    }
    await (0, jobLifecycle_1.updateQueuedJobStatus)({
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
async function handleJobFailure(args) {
    const message = args.err instanceof Error ? args.err.message : String(args.err);
    const terminal = (0, jobLifecycle_1.isNonRetryableError)(args.err) || args.attempts >= jobQueue_1.MAX_JOB_ATTEMPTS;
    await (0, jobLifecycle_1.updateQueuedJobStatus)({
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
    const job = await (0, jobQueue_1.claimNextQueuedJob)();
    if (!job)
        return false;
    try {
        if (job.type === 'repo-sync') {
            await handleRepoSyncJob(job.id, job.payload, job.attempts);
        }
        else if (job.type === 'pr-review') {
            await handlePrReviewJob(job.id, job.payload, job.attempts);
        }
        else {
            await (0, jobLifecycle_1.updateQueuedJobStatus)({
                queuedJobId: job.id,
                status: 'DEAD_LETTER',
                attempts: job.attempts,
                lastError: `Unknown job type: ${job.type}`
            });
        }
    }
    catch (err) {
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
