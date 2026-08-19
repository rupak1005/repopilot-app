import type { ParsedFile } from './treeSitterParser';
export type PersistedCounts = {
    fileId: string;
    revisionId: string;
    symbols: number;
    imports: number;
    exports: number;
};
export type RepositoryRevisionRecord = {
    id: string;
    revisionSha: string;
    indexedAt: Date;
};
export declare function ensureRepository(args: {
    repositoryId: string;
    name: string;
    owner: string;
}): Promise<void>;
export declare function ensureRepositoryRevision(args: {
    repositoryId: string;
    revisionSha: string;
}): Promise<RepositoryRevisionRecord>;
export declare function clearRevisionData(args: {
    revisionId: string;
}): Promise<void>;
export declare function insertFileParsedData(args: {
    repositoryId: string;
    revisionId: string;
    path: string;
    content: string;
    parsed: ParsedFile;
}): Promise<PersistedCounts>;
