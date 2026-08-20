import type {
  AskResponse,
  FileImpactAnalysis,
  HotspotRow,
  PullImpactSummary,
  PullRequestDetail,
  PullRequestRow,
  RepositoryAnalytics,
  SearchHit,
  SimilarChange
} from './types';
import type { ArchitectureGraph } from './architecture';

export const DEMO_PULLS: PullRequestRow[] = [
  {
    pullNumber: 42,
    title: 'Add GitHub OAuth and repo picker to dashboard',
    status: 'open',
    headRevision: 'a1b2c3d',
    latestReviewStatus: 'completed',
    latestReviewOutcome: 'PASS'
  },
  {
    pullNumber: 38,
    title: 'Phase 6: Ask chat UI with citations',
    status: 'open',
    headRevision: 'e4f5g6h',
    latestReviewStatus: 'completed',
    latestReviewOutcome: 'WARN'
  },
  {
    pullNumber: 31,
    title: 'Redis job queue for async repo sync',
    status: 'merged',
    headRevision: 'i7j8k9l',
    latestReviewStatus: 'completed',
    latestReviewOutcome: 'PASS'
  },
  {
    pullNumber: 27,
    title: 'Fix CORS for local web + API dev',
    status: 'merged',
    headRevision: 'm0n1o2p',
    latestReviewStatus: 'completed',
    latestReviewOutcome: 'PASS'
  },
  {
    pullNumber: 19,
    title: 'Semantic search over CodeChunk embeddings',
    status: 'closed',
    headRevision: 'q3r4s5t',
    latestReviewStatus: 'completed',
    latestReviewOutcome: 'FAIL'
  },
  {
    pullNumber: 12,
    title: 'Initial Fastify API scaffold',
    status: 'merged',
    headRevision: 'u6v7w8x',
    latestReviewStatus: 'completed',
    latestReviewOutcome: 'PASS'
  }
];

export const DEMO_ANALYTICS: RepositoryAnalytics = {
  totalReviews: 47,
  completedReviews: 42,
  failedReviews: 5,
  averageReviewLatencyMs: 12_400,
  findingsBySeverity: { critical: 2, high: 8, medium: 14, low: 23 }
};

export const DEMO_HOTSPOTS: HotspotRow[] = [
  {
    filePath: 'api/src/server.ts',
    score: 92.4,
    changeCount: 38,
    dependentCount: 14,
    coChangeCount: 9,
    findingsCount: 4,
    reasons: ['high churn', 'many dependents']
  },
  {
    filePath: 'web/lib/dashboard.tsx',
    score: 78.1,
    changeCount: 24,
    dependentCount: 8,
    coChangeCount: 5,
    findingsCount: 1,
    reasons: ['recent edits', 'shared module']
  },
  {
    filePath: 'api/src/services/codebaseQa.ts',
    score: 65.3,
    changeCount: 17,
    dependentCount: 3,
    coChangeCount: 4,
    findingsCount: 2,
    reasons: ['AI surface']
  },
  {
    filePath: 'web/components/AppShell.tsx',
    score: 54.8,
    changeCount: 14,
    dependentCount: 6,
    coChangeCount: 2,
    findingsCount: 0,
    reasons: ['UI churn']
  },
  {
    filePath: 'common/src/github.ts',
    score: 41.2,
    changeCount: 9,
    dependentCount: 11,
    coChangeCount: 1,
    findingsCount: 0,
    reasons: ['stable core']
  }
];

export const DEMO_ARCHITECTURE: ArchitectureGraph = {
  nodes: [
    { filePath: 'api/src/server.ts', isHotspot: true, score: 92 },
    { filePath: 'api/src/services/codebaseQa.ts', isHotspot: true, score: 65 },
    { filePath: 'api/src/services/repositorySync.ts', isHotspot: false, score: 48 },
    { filePath: 'api/src/services/prReview.ts', isHotspot: false, score: 44 },
    { filePath: 'api/src/services/searchIndex.ts', isHotspot: false, score: 40 },
    { filePath: 'api/src/services/engineeringIntelligence.ts', isHotspot: false, score: 38 },
    { filePath: 'web/lib/dashboard.tsx', isHotspot: true, score: 78 },
    { filePath: 'web/pages/dashboard/[repoId]/ask.tsx', isHotspot: false, score: 22 },
    { filePath: 'web/pages/dashboard/[repoId]/search.tsx', isHotspot: false, score: 18 },
    { filePath: 'web/components/AppShell.tsx', isHotspot: true, score: 55 },
    { filePath: 'common/src/github.ts', isHotspot: false, score: 41 }
  ],
  edges: [
    { fromModule: 'api/src/server.ts', toModule: 'api/src/services/codebaseQa.ts' },
    { fromModule: 'api/src/server.ts', toModule: 'api/src/services/repositorySync.ts' },
    { fromModule: 'api/src/server.ts', toModule: 'api/src/services/searchIndex.ts' },
    { fromModule: 'api/src/server.ts', toModule: 'api/src/services/engineeringIntelligence.ts' },
    { fromModule: 'api/src/services/codebaseQa.ts', toModule: 'api/src/services/searchIndex.ts' },
    { fromModule: 'api/src/services/searchIndex.ts', toModule: 'api/src/services/codebaseQa.ts' },
    { fromModule: 'api/src/services/prReview.ts', toModule: 'api/src/services/codebaseQa.ts' },
    { fromModule: 'web/lib/dashboard.tsx', toModule: 'web/components/AppShell.tsx' },
    { fromModule: 'web/pages/dashboard/[repoId]/ask.tsx', toModule: 'web/lib/dashboard.tsx' },
    { fromModule: 'web/pages/dashboard/[repoId]/search.tsx', toModule: 'web/lib/dashboard.tsx' },
    { fromModule: 'web/lib/dashboard.tsx', toModule: 'common/src/github.ts' },
    { fromModule: 'api/src/services/repositorySync.ts', toModule: 'common/src/github.ts' }
  ]
};

export const DEMO_SEARCH_HITS: SearchHit[] = [
  {
    file: 'api/src/cli.ts',
    lines: [48, 72],
    score: 0.94,
    text: 'async function syncRepo(args: SyncRepoArgs) {\n  const revisionSha = args.revisionSha ?? await resolveHeadSha(args.path);\n  await syncRepository({ repositoryId: args.repoId, path: args.path, revisionSha });'
  },
  {
    file: 'api/src/services/syncRepository.ts',
    lines: [12, 45],
    score: 0.91,
    text: 'export async function syncRepository(input: SyncInput) {\n  const files = await walkSourceFiles(input.path);\n  await upsertChunks(input.repositoryId, input.revisionSha, files);'
  },
  {
    file: 'web/lib/dashboard.tsx',
    lines: [72, 118],
    score: 0.87,
    text: 'export function useRepoData(repoId: string | null) {\n  const [pulls, setPulls] = useState<PullRequestRow[]>([]);\n  // loads pulls, analytics, hotspots from API'
  },
  {
    file: 'api/src/services/codebaseQa.ts',
    lines: [182, 210],
    score: 0.82,
    text: 'export async function askCodebaseQuestion(args: {\n  repositoryId: string;\n  query: string;\n}) {\n  const context = await buildQuestionContext(args);'
  }
];

export const DEMO_ASK_RESPONSE: AskResponse = {
  answer:
    'syncRepository walks the repo on disk, chunks source files, and upserts them into CodeChunk for the given repositoryId and revision SHA. The CLI exposes this as sync-repo; the web dashboard reads indexed data via the REST API once sync completes.',
  confidence: 'HIGH',
  citations: [
    { file: 'api/src/services/syncRepository.ts', lines: [12, 45] },
    { file: 'api/src/cli.ts', lines: [48, 72] }
  ]
};

const DEMO_ASK_AUTH: AskResponse = {
  answer:
    'GitHub OAuth lives under web/pages/api/auth — sign-in redirects to GitHub, the callback stores a signed session cookie, and /api/auth/me exposes the user plus selected repo. Dashboard routes require that session before loading AppShell.',
  confidence: 'HIGH',
  citations: [
    { file: 'web/pages/api/auth/callback/github.ts', lines: [1, 40] },
    { file: 'web/lib/session.ts', lines: [1, 30] }
  ]
};

export function demoAskResponse(query: string): AskResponse {
  const q = query.toLowerCase().trim();
  if (/^(hi|hello|hey|yo)\b/.test(q)) {
    return {
      answer:
        'Hi! Ask me anything about this codebase — try a suggestion below or ask how sync, search, or auth work.',
      confidence: 'HIGH',
      citations: []
    };
  }
  if (q.includes('sync')) {
    return DEMO_ASK_RESPONSE;
  }
  if (q.includes('auth') || q.includes('oauth') || q.includes('login')) {
    return DEMO_ASK_AUTH;
  }
  if (q.includes('architect')) {
    return {
      answer:
        'RepoPilot splits into api (Fastify + Prisma + Redis jobs), web (Next.js dashboard), and common (shared IDs). The dashboard loads repo metrics via useRepoData; Ask and Search hit the API with the derived repository UUID from the GitHub slug.',
      confidence: 'MEDIUM',
      citations: [
        { file: 'web/lib/dashboard.tsx', lines: [72, 118] },
        { file: 'api/src/server.ts', lines: [244, 261] }
      ]
    };
  }
  return {
    answer: `Demo mode: no canned answer for “${query.trim()}”. Index your repo and disable demo mode for live AI answers grounded in your code.`,
    confidence: 'LOW',
    citations: []
  };
}

export function demoSearchResults(query: string): SearchHit[] {
  const q = query.toLowerCase();
  return DEMO_SEARCH_HITS.filter(
    (hit) =>
      hit.file.toLowerCase().includes(q) ||
      hit.text.toLowerCase().includes(q) ||
      q.length < 3
  ).slice(0, 6);
}

/** Simulated latency so demo interactions feel real. */
export function demoDelay(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEMO_PR_DETAILS: Record<number, PullRequestDetail> = {
  42: {
    pullNumber: 42,
    title: 'Refactor PaymentService.processPayment transaction ordering',
    body: 'Moves commit boundary after ledger write to match ADR-008.',
    status: 'open',
    baseRevision: 'base9af31d',
    headRevision: 'a1b2c3d',
    latestReview: {
      reviewId: 'demo-review-42',
      status: 'COMPLETED',
      outcome: 'WARN',
      headRevision: 'a1b2c3d',
      baseRevision: 'base9af31d',
      summary: {
        summary:
          'Payment path change touches a high-centrality service. One high-confidence finding on transaction ordering; five related tests identified.',
        filesChanged: 4,
        symbolsChanged: 2,
        findingsCount: 1,
        testSignals: [
          'api/src/services/payment.test.ts',
          'api/src/services/checkout.integration.test.ts',
          'web/lib/billing.test.ts'
        ]
      },
      findings: [
        {
          title: 'Possible transaction ordering regression in PaymentService',
          severity: 'HIGH',
          category: 'correctness',
          confidence: 'HIGH',
          description:
            'processPayment now commits the DB transaction before the ledger append. Historical PR #287 introduced a similar ordering bug that caused duplicate charges under retry.',
          suggestedAction:
            'Commit only after both persistence steps succeed, or wrap in a single transactional outbox.',
          evidence: [
            { type: 'diff', file: 'api/src/services/PaymentService.ts', lines: [84, 102] },
            { type: 'caller', file: 'api/src/routes/checkout.ts', lines: [41, 58] },
            { type: 'test', file: 'api/src/services/payment.test.ts', lines: [120, 148] }
          ]
        }
      ]
    }
  },
  38: {
    pullNumber: 38,
    title: 'Phase 6: Ask chat UI with citations',
    body: null,
    status: 'open',
    baseRevision: 'base38',
    headRevision: 'e4f5g6h',
    latestReview: {
      reviewId: 'demo-review-38',
      status: 'COMPLETED',
      outcome: 'WARN',
      headRevision: 'e4f5g6h',
      baseRevision: 'base38',
      summary: {
        summary: 'UI-only change with moderate surface area; missing test for sessionStorage thread persistence.',
        filesChanged: 6,
        symbolsChanged: 0,
        findingsCount: 1,
        testSignals: ['web/lib/askThread.test.ts']
      },
      findings: [
        {
          title: 'Ask thread persistence lacks edge-case test for repo switch',
          severity: 'MEDIUM',
          category: 'testing',
          confidence: 'MEDIUM',
          description: 'Session storage key is per-repo but no test covers rapid repo switching.',
          suggestedAction: 'Add askThread.test.ts case for concurrent repoId changes.',
          evidence: [{ type: 'context', file: 'web/lib/askThread.ts', lines: [1, 40] }]
        }
      ]
    }
  }
};

const DEMO_PR_IMPACT: Record<number, PullImpactSummary> = {
  42: {
    risk: 'HIGH',
    directDependents: 3,
    transitiveDependents: 14,
    relevantTests: 5,
    changedModules: ['api/src/services/PaymentService.ts', 'api/src/routes/checkout.ts'],
    note: 'Deterministic graph traversal + historical similarity to PR #287.'
  },
  38: {
    risk: 'MEDIUM',
    directDependents: 1,
    transitiveDependents: 4,
    relevantTests: 1,
    changedModules: ['web/pages/dashboard/[repoId]/ask.tsx', 'web/lib/askThread.ts']
  }
};

const DEMO_SIMILAR_CHANGES: Record<number, SimilarChange[]> = {
  42: [
    {
      pullNumber: 287,
      title: 'Fix payment retry ordering',
      overlapFiles: ['api/src/services/PaymentService.ts'],
      overlapCount: 1
    },
    {
      pullNumber: 31,
      title: 'Redis job queue for async repo sync',
      overlapFiles: ['api/src/services/jobQueue.ts'],
      overlapCount: 1
    }
  ]
};

export function demoPullDetail(pullNumber: number): PullRequestDetail | null {
  const detail = DEMO_PR_DETAILS[pullNumber];
  if (detail) return detail;

  const row = DEMO_PULLS.find((pull) => pull.pullNumber === pullNumber);
  if (!row) return null;

  return {
    pullNumber: row.pullNumber,
    title: row.title,
    body: null,
    status: row.status,
    baseRevision: 'demo-base',
    headRevision: row.headRevision,
    latestReview: row.latestReviewStatus
      ? {
          reviewId: `demo-review-${row.pullNumber}`,
          status: 'COMPLETED',
          outcome: row.latestReviewOutcome ?? undefined,
          headRevision: row.headRevision,
          baseRevision: 'demo-base',
          summary: {
            summary: 'Demo review — connect a real repo for live PR intelligence.',
            filesChanged: 2,
            symbolsChanged: 1,
            findingsCount: 0,
            testSignals: []
          },
          findings: []
        }
      : null
  };
}

export function demoPullImpact(pullNumber: number): PullImpactSummary | null {
  return DEMO_PR_IMPACT[pullNumber] ?? null;
}

export function demoSimilarChanges(pullNumber: number): SimilarChange[] {
  return DEMO_SIMILAR_CHANGES[pullNumber] ?? [];
}

const DEMO_FILE_IMPACT: Record<string, FileImpactAnalysis> = {
  'api/src/services/PaymentService.ts': {
    target: { filePath: 'api/src/services/PaymentService.ts' },
    revisionSha: 'demo42abc',
    risk: 'HIGH',
    confidence: 'HIGH',
    riskFactors: [
      {
        id: 'direct',
        label: 'Direct dependents',
        detail: '3 modules import this file',
        severity: 'warn'
      },
      {
        id: 'transitive',
        label: 'Transitive blast radius',
        detail: '3 downstream modules',
        severity: 'warn'
      },
      {
        id: 'tests',
        label: 'Test coverage signal',
        detail: '2 related test files found',
        severity: 'info'
      },
      {
        id: 'churn',
        label: 'Hotspot churn',
        detail: 'Hotspot score 62',
        severity: 'danger'
      }
    ],
    directDependents: [
      'api/src/routes/checkout.ts',
      'api/src/services/subscriptionBilling.ts',
      'api/src/worker.ts'
    ],
    transitiveDependents: [
      'web/pages/dashboard/[repoId]/pulls/[number].tsx',
      'api/src/services/prReview.ts',
      'api/src/server.ts'
    ],
    outboundImports: ['api/src/db/prisma.ts', 'api/src/services/jobQueue.ts'],
    relevantTests: [
      {
        filePath: 'api/src/services/PaymentService.test.ts',
        reason: 'Imports the target module directly.',
        confidence: 'HIGH'
      },
      {
        filePath: 'api/src/routes/checkout.test.ts',
        reason: 'Imports dependent module api/src/routes/checkout.ts.',
        confidence: 'MEDIUM'
      }
    ],
    coChanges: [
      { file: 'api/src/services/PaymentService.ts', pairedWith: 'api/src/routes/checkout.ts', count: 8 },
      { file: 'api/src/services/PaymentService.ts', pairedWith: 'api/prisma/schema.prisma', count: 3 }
    ],
    hotspot: { score: 62, changeCount: 14, reasons: ['high churn', 'review findings'] },
    checklist: [
      'Confirm direct dependents still behave correctly after your change.',
      'Run 2 recommended test files.',
      'Review 3 direct dependent module(s).',
      'Check co-change history — this file often changes with related modules.',
      'Consider splitting the change or scheduling extra review — blast radius is high.'
    ],
    summary:
      'api/src/services/PaymentService.ts has 3 direct and 3 transitive dependent module(s). 2 test file(s) import this area. Hotspot score 62 from 14 recent changes.'
  },
  'web/lib/askThread.ts': {
    target: { filePath: 'web/lib/askThread.ts' },
    revisionSha: 'demo38def',
    risk: 'MEDIUM',
    confidence: 'HIGH',
    riskFactors: [
      {
        id: 'direct',
        label: 'Direct dependents',
        detail: '1 module imports this file',
        severity: 'info'
      },
      {
        id: 'tests',
        label: 'Test coverage signal',
        detail: '1 related test file found',
        severity: 'info'
      },
      {
        id: 'churn',
        label: 'Hotspot churn',
        detail: 'Hotspot score 22',
        severity: 'warn'
      }
    ],
    directDependents: ['web/pages/dashboard/[repoId]/ask.tsx'],
    transitiveDependents: ['web/lib/dashboard.tsx'],
    outboundImports: [],
    relevantTests: [
      {
        filePath: 'web/lib/askThread.test.ts',
        reason: 'Imports the target module directly.',
        confidence: 'HIGH'
      }
    ],
    coChanges: [{ file: 'web/lib/askThread.ts', pairedWith: 'web/pages/dashboard/[repoId]/ask.tsx', count: 5 }],
    hotspot: { score: 22, changeCount: 6, reasons: ['recent PR activity'] },
    checklist: [
      'Confirm direct dependents still behave correctly after your change.',
      'Run 1 recommended test file.',
      'Review 1 direct dependent module(s).',
      'Check co-change history — this file often changes with related modules.'
    ],
    summary:
      'web/lib/askThread.ts has 1 direct and 1 transitive dependent module(s). 1 test file(s) import this area. Hotspot score 22 from 6 recent changes.'
  }
};

export function demoFileImpact(filePath: string): FileImpactAnalysis | null {
  return DEMO_FILE_IMPACT[filePath] ?? null;
}
