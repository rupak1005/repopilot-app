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

export interface SymbolDependency {
  fromSymbolId: string;
  toSymbolId: string;
}

export interface ModuleDependency {
  fromModule: string;
  toModule: string;
}

export interface DependencySymbolNode {
  symbolId: string;
  name: string;
  type: string;
}

export interface SymbolDependencyTraversalResponse {
  symbol: DependencySymbolNode;
  directCallers: DependencySymbolNode[];
  transitiveCallers: DependencySymbolNode[];
  graphDepth: number;
  cycleDetected: boolean;
}

export interface ModuleDependencyEdge {
  fromModule: string;
  toModule: string;
}

export interface ModuleDependencyTraversalResponse {
  file: {
    filePath: string;
  };
  directModuleDependents: ModuleDependencyEdge[];
  transitiveModuleDependents: ModuleDependencyEdge[];
  graphDepth: number;
}

