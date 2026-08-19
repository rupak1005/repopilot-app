export type BuildDependencyGraphResult = {
    repositoryId: string;
    revisionId: string;
    revisionSha: string;
    filesProcessed: number;
    symbolEdgesAdded: number;
    moduleEdgesAdded: number;
    cyclesDetected: number;
};
export declare function buildDependencyGraph(args: {
    repositoryId: string;
    revisionSha?: string;
}): Promise<BuildDependencyGraphResult>;
