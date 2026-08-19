import { type FileChange, type FileChangeStatus } from './diffParser';
import { type ReviewOutcome } from './reviewPolicy';
import { type LLMProvider } from './llmProvider';
export type ReviewEvidenceRef = {
    type: 'diff' | 'symbol' | 'caller' | 'test' | 'context';
    file: string;
    lines: [number, number];
};
export type ReviewFindingResult = {
    title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    category: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    suggestedAction?: string;
    evidence: ReviewEvidenceRef[];
};
export type PullRequestReviewSummary = {
    summary: string;
    filesChanged: number;
    symbolsChanged: number;
    findingsCount: number;
    testSignals: string[];
};
export type PullRequestReviewResult = {
    reviewId: string;
    pullRequestId: string;
    pullNumber: number;
    headRevision: string;
    baseRevision: string;
    status: 'QUEUED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
    outcome?: ReviewOutcome;
    checkRunId?: string | null;
    summary: PullRequestReviewSummary;
    findings: ReviewFindingResult[];
};
export type ChangedSymbol = {
    name: string;
    type: string;
    change: 'ADDED' | 'REMOVED' | 'MODIFIED';
    filePath: string;
    startLine: number;
    endLine: number;
    symbolId?: string;
};
type ContextSnippet = {
    id: string;
    file: string;
    lines: [number, number];
    text: string;
    type: ReviewEvidenceRef['type'];
};
type GitHubFileInput = {
    path: string;
    status: FileChangeStatus;
    patch?: string | null;
    additions?: number;
    deletions?: number;
};
export declare function detectChangedSymbols(args: {
    filePath: string;
    baseContent: string | null;
    headContent: string | null;
}): ChangedSymbol[];
export declare function validateReviewFindings(raw: string, snippets: ContextSnippet[]): {
    summary: string;
    findings: ReviewFindingResult[];
} | null;
export declare function buildFileChangesFromRevisions(args: {
    repositoryId: string;
    baseRevision: string;
    headRevision: string;
    githubFiles?: GitHubFileInput[];
}): Promise<FileChange[]>;
export declare function listPullRequests(repositoryId: string): Promise<Array<{
    pullNumber: number;
    title: string;
    status: string;
    headRevision: string;
    latestReviewStatus: string | null;
    latestReviewOutcome: string | null;
}>>;
export declare function getPullRequestDetails(args: {
    repositoryId: string;
    pullNumber: number;
}): Promise<{
    pullNumber: number;
    title: string;
    body: string | null;
    status: string;
    baseRevision: string;
    headRevision: string;
    latestReview: PullRequestReviewResult | null;
} | null>;
export declare function runPullRequestReview(args: {
    repositoryId: string;
    pullNumber: number;
    githubFiles?: GitHubFileInput[];
    force?: boolean;
    provider?: LLMProvider;
}): Promise<PullRequestReviewResult>;
export declare function queuePullRequestReview(args: {
    repositoryId: string;
    pullNumber: number;
    pullRequestId: string;
    baseSha: string;
    headSha: string;
    queuedJobId?: string;
    force?: boolean;
}): Promise<{
    reviewId: string;
    queuedJobId: string;
}>;
export declare function triggerPullRequestReview(args: {
    repositoryId: string;
    pullNumber: number;
    force?: boolean;
    githubFiles?: GitHubFileInput[];
    sync?: boolean;
}): Promise<PullRequestReviewResult | {
    queued: true;
    reviewId: string;
    queuedJobId: string;
}>;
export {};
