export type QueuedJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER' | 'STALE';
export declare function updateQueuedJobStatus(args: {
    queuedJobId: string;
    status: QueuedJobStatus;
    attempts?: number;
    lastError?: string | null;
    bullJobId?: string | null;
}): Promise<void>;
export declare function markStaleQueuedJobsForPullRequest(args: {
    pullRequestId: string;
    currentHeadRevision: string;
}): Promise<void>;
export declare function isNonRetryableError(err: unknown): boolean;
