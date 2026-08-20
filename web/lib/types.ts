export const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://repopilot-pi.vercel.app';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type PullRequestRow = {
  pullNumber: number;
  title: string;
  status: string;
  headRevision: string;
  latestReviewStatus: string | null;
  latestReviewOutcome: string | null;
};

export type ReviewEvidence = {
  type: string;
  file: string;
  lines: [number, number];
};

export type ReviewFinding = {
  title: string;
  severity: string;
  category: string;
  confidence: string;
  description: string;
  suggestedAction?: string;
  evidence: ReviewEvidence[];
};

export type PullReviewSummary = {
  summary: string;
  filesChanged: number;
  symbolsChanged: number;
  findingsCount: number;
  testSignals: string[];
};

export type PullReviewResult = {
  reviewId: string;
  status: string;
  outcome?: string;
  headRevision: string;
  baseRevision: string;
  summary: PullReviewSummary;
  findings: ReviewFinding[];
};

export type PullRequestDetail = {
  pullNumber: number;
  title: string;
  body: string | null;
  status: string;
  baseRevision: string;
  headRevision: string;
  latestReview: PullReviewResult | null;
};

export type SimilarChange = {
  pullNumber: number;
  title: string;
  overlapFiles: string[];
  overlapCount: number;
};

export type PullImpactSummary = {
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  directDependents: number;
  transitiveDependents: number;
  relevantTests: number;
  changedModules: string[];
  note?: string;
};

export type ImpactTestRecommendation = {
  filePath: string;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM';
};

export type FileImpactAnalysis = {
  target: { filePath: string };
  revisionSha: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: Array<{
    id: string;
    label: string;
    detail: string;
    severity: 'info' | 'warn' | 'danger';
  }>;
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports: string[];
  relevantTests: ImpactTestRecommendation[];
  coChanges: Array<{ file: string; pairedWith: string; count: number }>;
  hotspot: { score: number; changeCount: number; reasons: string[] } | null;
  checklist: string[];
  summary: string;
};

export type RepositoryAnalytics = {
  totalReviews: number;
  completedReviews: number;
  failedReviews: number;
  averageReviewLatencyMs: number | null;
  findingsBySeverity: Record<string, number>;
};

export type HotspotRow = {
  filePath: string;
  score: number;
  changeCount: number;
  reasons: string[];
  dependentCount?: number;
  coChangeCount?: number;
  findingsCount?: number;
};

export type SearchHit = {
  file: string;
  lines: [number, number];
  text: string;
  score: number;
};

export type AskResponse = {
  answer: string;
  confidence: string;
  citations: Array<{ file: string; lines: [number, number] }>;
};

export function parseRepoSlug(fullName: string): { owner: string; name: string } {
  const [owner, name] = fullName.split('/');
  return { owner: owner ?? '', name: name ?? fullName };
}
