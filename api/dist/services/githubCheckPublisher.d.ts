import type { PullRequestReviewResult } from './prReview';
import { type ReviewOutcome } from './reviewPolicy';
export type CheckAnnotation = {
    path: string;
    start_line: number;
    end_line: number;
    annotation_level: 'failure' | 'warning' | 'notice';
    message: string;
    title: string;
};
export interface ReviewPublisher {
    publishReview(args: {
        owner: string;
        repo: string;
        headSha: string;
        outcome: ReviewOutcome;
        review: PullRequestReviewResult;
        existingCheckRunId?: string | null;
    }): Promise<{
        checkRunId: string | null;
    }>;
}
export declare class GitHubCheckPublisher implements ReviewPublisher {
    private readonly token;
    constructor(token: string);
    publishReview(args: {
        owner: string;
        repo: string;
        headSha: string;
        outcome: ReviewOutcome;
        review: PullRequestReviewResult;
        existingCheckRunId?: string | null;
    }): Promise<{
        checkRunId: string | null;
    }>;
}
export declare class NoOpReviewPublisher implements ReviewPublisher {
    publishReview(args: {
        owner: string;
        repo: string;
        headSha: string;
        outcome: ReviewOutcome;
        review: PullRequestReviewResult;
    }): Promise<{
        checkRunId: string | null;
    }>;
}
export declare function getDefaultReviewPublisher(): ReviewPublisher;
