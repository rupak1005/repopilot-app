"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_JOB_ATTEMPTS = void 0;
exports.claimNextQueuedJob = claimNextQueuedJob;
const prisma_1 = require("../db/prisma");
async function claimNextQueuedJob() {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      UPDATE "QueuedJob"
      SET
        "status" = 'RUNNING',
        "attempts" = "attempts" + 1,
        "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id"
        FROM "QueuedJob"
        WHERE "status" = 'QUEUED'
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "type", "payload", "attempts"
    `));
    const job = rows[0];
    if (!job)
        return null;
    return {
        id: job.id,
        type: job.type,
        payload: job.payload,
        attempts: job.attempts
    };
}
exports.MAX_JOB_ATTEMPTS = 3;
