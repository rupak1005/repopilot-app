export interface Repository {
    id: string;
    name: string;
    owner: string;
    createdAt: Date;
}
export interface PullRequest {
    repositoryId: string;
    number: number;
    title: string;
    baseBranch: string;
    headBranch: string;
    baseRevision: string;
    headRevision: string;
    status: string;
}
