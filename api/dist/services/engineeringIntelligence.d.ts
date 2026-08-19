export type HotspotResult = {
    filePath: string;
    score: number;
    changeCount: number;
    dependentCount: number;
    coChangeCount: number;
    findingsCount: number;
    reasons: string[];
};
export type CoChangeResult = {
    file: string;
    pairedWith: string;
    count: number;
};
export type HistorySearchResult = {
    type: 'commit' | 'pull_request';
    id: string;
    title: string;
    snippet: string;
    authoredAt?: string;
};
export type SimilarChangeResult = {
    pullNumber: number;
    title: string;
    overlapFiles: string[];
    overlapCount: number;
};
export type ArchitectureNode = {
    filePath: string;
    isHotspot: boolean;
    score: number;
};
export type ArchitectureEdge = {
    fromModule: string;
    toModule: string;
};
export declare function listModuleHotspots(args: {
    repositoryId: string;
    topK?: number;
}): Promise<HotspotResult[]>;
export declare function getCoChanges(args: {
    repositoryId: string;
    filePath: string;
    topK?: number;
}): Promise<CoChangeResult[]>;
export declare function searchHistory(args: {
    repositoryId: string;
    query: string;
    type?: 'commit' | 'pull_request' | 'all';
    topK?: number;
}): Promise<HistorySearchResult[]>;
export declare function findSimilarChanges(args: {
    repositoryId: string;
    pullNumber: number;
    topK?: number;
}): Promise<SimilarChangeResult[]>;
export declare function getArchitectureGraph(args: {
    repositoryId: string;
    revisionSha?: string;
}): Promise<{
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
}>;
export declare function getSymbolChangeHistory(args: {
    repositoryId: string;
    symbolName: string;
    topK?: number;
}): Promise<Array<{
    sha: string;
    message: string;
    authoredAt: string;
    filePath: string;
}>>;
