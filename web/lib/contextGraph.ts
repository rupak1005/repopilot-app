export type ModuleDependencyTraversal = {
  file: { filePath: string };
  directModuleDependents: Array<{ fromModule: string; toModule: string }>;
  transitiveModuleDependents: Array<{ fromModule: string; toModule: string }>;
  graphDepth: number;
};

export type ContextGraphSlice = {
  revisionSha: string;
  nodes: Array<{
    id: string;
    kind: 'file' | 'symbol';
    label: string;
    filePath?: string;
    symbolType?: string;
    isHotspot?: boolean;
    score?: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    kind: 'imports' | 'calls';
    provenance: 'parser';
  }>;
  meta?: {
    graphDepth?: number;
    cycleDetected?: boolean;
  };
};

export function dependentModules(traversal: ModuleDependencyTraversal): string[] {
  const names = [
    ...traversal.directModuleDependents.map((edge) => edge.fromModule),
    ...traversal.transitiveModuleDependents.map((edge) => edge.fromModule)
  ];
  return [...new Set(names)];
}

export function directDependentModules(traversal: ModuleDependencyTraversal): string[] {
  return [...new Set(traversal.directModuleDependents.map((edge) => edge.fromModule))];
}

export function importedModules(slice: ContextGraphSlice, filePath: string): string[] {
  return slice.edges
    .filter((edge) => edge.from === filePath && edge.kind === 'imports')
    .map((edge) => edge.to);
}
