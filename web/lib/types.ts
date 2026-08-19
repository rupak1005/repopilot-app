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

export function outcomeIcon(outcome: string | null): string {
  switch (outcome) {
    case 'PASS':
      return '✓';
    case 'WARN':
      return '⚠';
    case 'FAIL':
      return '✕';
    default:
      return '…';
  }
}

export function parseRepoSlug(fullName: string): { owner: string; name: string } {
  const [owner, name] = fullName.split('/');
  return { owner: owner ?? '', name: name ?? fullName };
}
