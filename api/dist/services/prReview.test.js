"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const vitest_1 = require("vitest");
const prisma_1 = require("../db/prisma");
const prReview_1 = require("./prReview");
class MockReviewProvider {
    async createStructuredResponse(_args) {
        return {
            provider: 'mock',
            content: JSON.stringify({
                summary: 'Potential missing test coverage for changed helper.',
                findings: [
                    {
                        title: 'Changed helper lacks related test',
                        severity: 'MEDIUM',
                        category: 'testing',
                        confidence: 'MEDIUM',
                        description: 'The changed helper has no related test coverage signal.',
                        suggestedAction: 'Add a unit test for the changed helper.',
                        evidence: [{ evidenceId: 'symbol:modified:src/util.ts:1-3', type: 'symbol' }]
                    }
                ]
            })
        };
    }
}
(0, vitest_1.describe)('detectChangedSymbols', () => {
    (0, vitest_1.it)('detects added, removed, and modified symbols', () => {
        const base = `
export function keep() {}
export function oldName() {}
export function mutate() { return 1; }
`.trim();
        const head = `
export function keep() {}
export function newName() {}
export function mutate() { return 2; }
`.trim();
        const changed = (0, prReview_1.detectChangedSymbols)({
            filePath: 'src/example.ts',
            baseContent: base,
            headContent: head
        });
        (0, vitest_1.expect)(changed.some((symbol) => symbol.change === 'ADDED' && symbol.name === 'newName')).toBe(true);
        (0, vitest_1.expect)(changed.some((symbol) => symbol.change === 'REMOVED' && symbol.name === 'oldName')).toBe(true);
        (0, vitest_1.expect)(changed.some((symbol) => symbol.change === 'MODIFIED' && symbol.name === 'mutate')).toBe(true);
    });
});
(0, vitest_1.describe)('validateReviewFindings', () => {
    (0, vitest_1.it)('keeps only grounded findings and deduplicates', () => {
        const snippets = [
            {
                id: 'symbol:modified:src/util.ts:1-3',
                file: 'src/util.ts',
                lines: [1, 3],
                text: 'export function helper() {}',
                type: 'symbol'
            }
        ];
        const validated = (0, prReview_1.validateReviewFindings)(JSON.stringify({
            summary: 'One grounded finding.',
            findings: [
                {
                    title: 'Grounded',
                    severity: 'LOW',
                    category: 'testing',
                    confidence: 'HIGH',
                    description: 'Grounded in snippet.',
                    evidence: [{ evidenceId: 'symbol:modified:src/util.ts:1-3', type: 'symbol' }]
                },
                {
                    title: 'Ungrounded',
                    severity: 'HIGH',
                    category: 'bug',
                    confidence: 'HIGH',
                    description: 'Not in context.',
                    evidence: [{ evidenceId: 'missing:id', type: 'diff' }]
                },
                {
                    title: 'Grounded',
                    severity: 'LOW',
                    category: 'testing',
                    confidence: 'HIGH',
                    description: 'Duplicate.',
                    evidence: [{ evidenceId: 'symbol:modified:src/util.ts:1-3', type: 'symbol' }]
                }
            ]
        }), snippets);
        (0, vitest_1.expect)(validated?.findings).toHaveLength(1);
        (0, vitest_1.expect)(validated?.findings[0]?.evidence[0]?.file).toBe('src/util.ts');
    });
});
(0, vitest_1.describe)('MockReviewProvider', () => {
    (0, vitest_1.it)('returns structured review JSON', async () => {
        const provider = new MockReviewProvider();
        const response = await provider.createStructuredResponse({
            messages: [],
            schema: { name: 'pull_request_review', schema: {} }
        });
        const parsed = JSON.parse(response.content);
        (0, vitest_1.expect)(Array.isArray(parsed.findings)).toBe(true);
    });
});
async function ensurePhase8Tables() {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PullRequestReview" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "pullRequestId" UUID NOT NULL,
      "headRevision" TEXT NOT NULL,
      "baseRevision" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "summary" JSONB,
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP(3),
      CONSTRAINT "PullRequestReview_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "PullRequestReview_pullRequestId_fkey"
        FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE
    )
  `);
    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PullRequestReview_pullRequestId_headRevision_key"
      ON "PullRequestReview"("pullRequestId", "headRevision")
  `);
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReviewFinding" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "reviewId" UUID NOT NULL,
      "title" TEXT NOT NULL,
      "severity" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "confidence" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "suggestedAction" TEXT,
      CONSTRAINT "ReviewFinding_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ReviewFinding_reviewId_fkey"
        FOREIGN KEY ("reviewId") REFERENCES "PullRequestReview"("id") ON DELETE CASCADE
    )
  `);
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReviewEvidence" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "findingId" UUID NOT NULL,
      "type" TEXT NOT NULL,
      "filePath" TEXT NOT NULL,
      "startLine" INTEGER NOT NULL,
      "endLine" INTEGER NOT NULL,
      "revisionId" UUID,
      CONSTRAINT "ReviewEvidence_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ReviewEvidence_findingId_fkey"
        FOREIGN KEY ("findingId") REFERENCES "ReviewFinding"("id") ON DELETE CASCADE
    )
  `);
}
const testDbUrl = process.env.TEST_DATABASE_URL;
vitest_1.describe.skipIf(!testDbUrl)('runPullRequestReview integration', () => {
    (0, vitest_1.it)('creates a completed review for an indexed pull request', async () => {
        process.env.DATABASE_URL = testDbUrl;
        await ensurePhase8Tables();
        const prisma = (0, prisma_1.getPrisma)();
        const repositoryId = node_crypto_1.default.randomUUID();
        const pullRequestId = node_crypto_1.default.randomUUID();
        await prisma.$executeRawUnsafe(`
        INSERT INTO "Repository" ("id", "name", "owner")
        VALUES ($1, 'phase8', 'local')
      `, repositoryId);
        await prisma.$executeRawUnsafe(`
        INSERT INTO "PullRequest" (
          "id",
          "repositoryId",
          "number",
          "title",
          "body",
          "baseBranch",
          "headBranch",
          "baseRevision",
          "headRevision",
          "status"
        )
        VALUES ($1, $2, 1, 'Phase 8 test PR', NULL, 'main', 'feature', 'base-sha', 'head-sha', 'OPEN')
      `, pullRequestId, repositoryId);
        const result = await (0, prReview_1.runPullRequestReview)({
            repositoryId,
            pullNumber: 1,
            provider: new MockReviewProvider()
        });
        (0, vitest_1.expect)(result.status).toBe('COMPLETED');
        (0, vitest_1.expect)(result.summary.filesChanged).toBeGreaterThanOrEqual(0);
    });
});
