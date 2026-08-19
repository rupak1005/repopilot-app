export type RepositoryAnalytics = {
    repositoryId: string;
    totalReviews: number;
    completedReviews: number;
    failedReviews: number;
    averageReviewLatencyMs: number | null;
    findingsBySeverity: Record<string, number>;
    recurringFindings: Array<{
        fingerprint: string;
        count: number;
    }>;
};
export declare function getRepositoryAnalytics(repositoryId: string): Promise<RepositoryAnalytics>;
export declare function listReviewHistory(args: {
    repositoryId: string;
    pullNumber?: number;
}): Promise<Array<{
    reviewId: string;
    pullNumber: number;
    headRevision: string;
    status: string;
    outcome: string | null;
    startedAt: string;
    completedAt: string | null;
    findingsCount: number;
}>>;
