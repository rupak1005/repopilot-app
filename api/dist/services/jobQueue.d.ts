export type RepoSyncJobPayload = {
    repositoryId: string;
    revisionSha: string;
    ref?: string | null;
    queuedJobId?: string;
};
export type PrReviewJobPayload = {
    repositoryId: string;
    pullRequestId: string;
    pullNumber: number;
    baseSha: string;
    headSha: string;
    queuedJobId?: string;
};
export type ClaimedQueuedJob = {
    id: string;
    type: string;
    payload: RepoSyncJobPayload | PrReviewJobPayload;
    attempts: number;
};
export declare function claimNextQueuedJob(): Promise<ClaimedQueuedJob | null>;
export declare const MAX_JOB_ATTEMPTS = 3;
