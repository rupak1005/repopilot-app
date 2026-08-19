export type ParsedCommit = {
    sha: string;
    authorName: string;
    authorEmail: string;
    authoredAt: string;
    message: string;
    files: Array<{
        filePath: string;
        changeType: 'added' | 'modified' | 'deleted' | 'renamed';
    }>;
};
export type HistoryIngestResult = {
    repositoryId: string;
    commitsIngested: number;
    fileChangesIngested: number;
    coChangePairsUpdated: number;
    hotspotsUpdated: number;
    lastProcessedSha: string | null;
};
export declare function parseGitLogOutput(output: string): ParsedCommit[];
export declare function coChangePairsForCommit(filePaths: string[], maxFiles?: number): Array<[string, string]>;
export declare function computeHotspotScore(args: {
    changeCount: number;
    dependentCount: number;
    coChangeCount: number;
    findingsCount: number;
}): number;
export declare function hotspotExplanation(args: {
    changeCount: number;
    dependentCount: number;
    coChangeCount: number;
    findingsCount: number;
}): string[];
export declare function ingestRepositoryHistory(args: {
    repositoryId: string;
    repoPath: string;
    rebuild?: boolean;
    maxCount?: number;
}): Promise<HistoryIngestResult>;
export declare function recomputeModuleHotspots(repositoryId: string): Promise<number>;
