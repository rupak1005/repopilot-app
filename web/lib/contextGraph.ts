export type ModuleDependencyTraversal = {
  file: { filePath: string };
  directModuleDependents: Array<{ fromModule: string; toModule: string }>;
  transitiveModuleDependents: Array<{ fromModule: string; toModule: string }>;
  graphDepth: number;
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
