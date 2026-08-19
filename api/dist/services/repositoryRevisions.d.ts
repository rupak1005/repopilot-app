export type RepositoryRevisionInfo = {
    id: string;
    repositoryId: string;
    revisionSha: string;
    indexedAt: Date;
};
export type RepositoryRevisionStatus = RepositoryRevisionInfo & {
    fileCount: number;
    symbolCount: number;
    symbolDependencyCount: number;
    moduleDependencyCount: number;
};
export declare function resolveRepositoryRevision(args: {
    repositoryId: string;
    revisionSha?: string;
}): Promise<RepositoryRevisionInfo | null>;
export declare function listRepositoryRevisions(repositoryId: string): Promise<RepositoryRevisionInfo[]>;
export declare function getRepositoryRevisionStatus(args: {
    repositoryId: string;
    revisionSha: string;
}): Promise<RepositoryRevisionStatus | null>;
