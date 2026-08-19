type GitHubRepositoryPayload = {
    name: string;
    full_name: string;
    owner?: {
        login?: string;
    };
};
export type WebhookHandleResult = {
    duplicate: boolean;
    repositoryId: string | null;
    queuedJobId: string | null;
    event: string;
};
export declare function deriveRepositoryId(repository: GitHubRepositoryPayload): string;
export declare function verifyGitHubSignature(args: {
    rawBody: string;
    signatureHeader?: string;
    secret: string;
}): boolean;
export declare function handleGitHubWebhook(args: {
    event: string;
    deliveryId: string;
    rawBody: string;
}): Promise<WebhookHandleResult>;
export {};
