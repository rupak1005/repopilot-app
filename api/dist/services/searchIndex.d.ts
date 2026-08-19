export type TextChunk = {
    startLine: number;
    endLine: number;
    text: string;
};
export type SearchResult = {
    file: string;
    lines: [number, number];
    text: string;
    score: number;
    sources: Array<'lexical' | 'semantic' | 'graph'>;
};
export type SearchResponse = {
    results: SearchResult[];
};
export type SearchIndexResult = {
    repositoryId: string;
    revisionId: string;
    revisionSha: string;
    chunksIndexed: number;
    provider: string;
};
export declare function chunkText(text: string): TextChunk[];
export declare function indexRepositorySearch(args: {
    repositoryId: string;
    revisionSha?: string;
}): Promise<SearchIndexResult>;
export declare function searchRepository(args: {
    repositoryId: string;
    query: string;
    topK?: number;
    revisionSha?: string;
}): Promise<SearchResponse>;
