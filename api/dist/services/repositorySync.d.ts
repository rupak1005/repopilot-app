export type SyncRepositoryArgs = {
    repositoryId: string;
    repoPath: string;
    revisionSha?: string;
    repositoryName?: string;
    owner?: string;
    concurrency?: number;
};
export type SyncRepositoryResult = {
    repositoryId: string;
    revisionId: string;
    revisionSha: string;
    filesScanned: number;
    filesParsed: number;
    symbolsExtracted: number;
    importsExtracted: number;
    exportsExtracted: number;
    chunksIndexed: number;
};
export declare function syncRepository(args: SyncRepositoryArgs): Promise<SyncRepositoryResult>;
