type AdjacencyMap = Map<string, Set<string>>;
type DependencySymbolNode = {
    symbolId: string;
    name: string;
    type: string;
};
type ModuleDependencyEdge = {
    fromModule: string;
    toModule: string;
};
export type SymbolDependencyTraversalResponse = {
    symbol: DependencySymbolNode;
    directCallers: DependencySymbolNode[];
    transitiveCallers: DependencySymbolNode[];
    graphDepth: number;
    cycleDetected: boolean;
};
export type ModuleDependencyTraversalResponse = {
    file: {
        filePath: string;
    };
    directModuleDependents: ModuleDependencyEdge[];
    transitiveModuleDependents: ModuleDependencyEdge[];
    graphDepth: number;
};
declare function breadthFirstExpand(args: {
    startIds: string[];
    adjacency: AdjacencyMap;
    depthLimit: number;
}): string[];
declare function findStronglyConnectedComponents(adjacency: AdjacencyMap): string[][];
export declare function getSymbolDependencyTraversal(args: {
    repositoryId: string;
    symbolId: string;
    revisionSha?: string;
    depthLimit?: number;
}): Promise<SymbolDependencyTraversalResponse | null>;
export declare function getModuleDependencyTraversal(args: {
    repositoryId: string;
    filePath: string;
    revisionSha?: string;
    depthLimit?: number;
}): Promise<ModuleDependencyTraversalResponse | null>;
export { breadthFirstExpand, findStronglyConnectedComponents };
