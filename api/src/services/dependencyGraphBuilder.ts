import path from 'node:path';
import { getPrisma, prismaInteractiveTxOptions } from '../db/prisma';
import { resolveModuleSpecifier } from '../repo/moduleResolve';
import {
  createTreeSitterParser,
  extractGoImports,
  extractPythonImports
} from '../repo/treeSitterParser';
import { resolveRepositoryRevision } from './repositoryRevisions';

type TreeSitterSyntaxNode = {
  type: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number };
  endPosition: { row: number };
  namedChildren: TreeSitterSyntaxNode[];
  childForFieldName(fieldName: string): TreeSitterSyntaxNode | null;
};

type FileWithRecords = {
  id: string;
  revisionId: string;
  path: string;
  content: string;
  symbols: Array<{
    id: string;
    fileId: string;
    name: string;
    type: string;
    startLine: number;
    endLine: number;
  }>;
  exports: Array<{ name: string }>;
};

type ImportBinding = {
  module: string;
  kind: 'named' | 'default' | 'namespace';
  importedName: string;
};

type SymbolEdge = {
  fromSymbolId: string;
  toSymbolId: string;
};

type ModuleEdge = {
  fromModule: string;
  toModule: string;
};

export type BuildDependencyGraphResult = {
  repositoryId: string;
  revisionId: string;
  revisionSha: string;
  filesProcessed: number;
  symbolEdgesAdded: number;
  moduleEdgesAdded: number;
  cyclesDetected: number;
};

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      ...fields
    })
  );
}

function nodeText(code: string, node: TreeSitterSyntaxNode): string {
  return code.slice(node.startIndex, node.endIndex);
}

function declarationTypeForNode(node: TreeSitterSyntaxNode): string | null {
  switch (node.type) {
    case 'function_declaration':
    case 'method_declaration':
    case 'function_definition':
      return 'function';
    case 'class_declaration':
    case 'class_definition':
      return 'class';
    case 'interface_declaration':
      return 'interface';
    case 'type_alias_declaration':
    case 'type_spec':
      return 'type';
    default:
      return null;
  }
}

function symbolKey(args: {
  type: string;
  name: string;
  startLine: number;
  endLine: number;
}): string {
  return `${args.type}:${args.name}:${args.startLine}:${args.endLine}`;
}

function unwrapDeclaration(node: TreeSitterSyntaxNode): TreeSitterSyntaxNode {
  if (node.type !== 'decorated_definition' && node.type !== 'type_declaration') return node;
  for (const nested of node.namedChildren) {
    if (declarationTypeForNode(nested) || nested.type === 'decorated_definition') {
      return unwrapDeclaration(nested);
    }
  }
  return node;
}

function getDeclarationNodes(
  root: TreeSitterSyntaxNode
): Array<{ node: TreeSitterSyntaxNode; type: string }> {
  const declarations: Array<{ node: TreeSitterSyntaxNode; type: string }> = [];

  for (const child of root.namedChildren) {
    if (child.type === 'export_statement') {
      for (const nested of child.namedChildren) {
        const type = declarationTypeForNode(nested);
        if (type) declarations.push({ node: nested, type });
      }
      continue;
    }

    const unwrapped = unwrapDeclaration(child);
    const type = declarationTypeForNode(unwrapped);
    if (type) declarations.push({ node: unwrapped, type });
  }

  return declarations;
}

function addParsedImportBindings(
  bindings: Map<string, ImportBinding>,
  module: string,
  specifiers: string[]
) {
  if (specifiers.length === 0) {
    const local = module.split(/[./]/).filter(Boolean).pop() ?? module;
    bindings.set(local, { module, kind: 'namespace', importedName: '*' });
    return;
  }
  for (const spec of specifiers) {
    if (spec === '*') {
      bindings.set(module, { module, kind: 'namespace', importedName: '*' });
      continue;
    }
    bindings.set(spec, { module, kind: 'named', importedName: spec });
  }
}

function extractImportBindings(
  root: TreeSitterSyntaxNode,
  code: string,
  filePath: string
): Map<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.py') {
    for (const child of root.namedChildren) {
      if (child.type !== 'import_statement' && child.type !== 'import_from_statement') continue;
      for (const parsed of extractPythonImports(nodeText(code, child))) {
        addParsedImportBindings(bindings, parsed.module, parsed.specifiers);
      }
    }
    return bindings;
  }

  if (ext === '.go') {
    for (const child of root.namedChildren) {
      if (child.type !== 'import_declaration') continue;
      for (const parsed of extractGoImports(nodeText(code, child))) {
        addParsedImportBindings(bindings, parsed.module, parsed.specifiers);
      }
    }
    return bindings;
  }

  for (const child of root.namedChildren) {
    if (child.type !== 'import_statement') continue;

    const text = nodeText(code, child);
    const moduleMatch =
      text.match(/from\s+['"]([^'"]+)['"]/) ?? text.match(/import\s+['"]([^'"]+)['"]/);
    const module = moduleMatch?.[1];

    if (!module) continue;

    const namespaceMatch = text.match(/^import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from/);
    if (namespaceMatch?.[1]) {
      bindings.set(namespaceMatch[1], {
        module,
        kind: 'namespace',
        importedName: '*'
      });
    }

    const namedMatch = text.match(/\{([^}]+)\}/);
    if (namedMatch?.[1]) {
      for (const rawPart of namedMatch[1].split(',')) {
        const cleaned = rawPart.trim();
        if (!cleaned) continue;

        const aliasParts = cleaned.split(/\s+as\s+/i).map((part) => part.trim());
        const importedName = aliasParts[0];
        const localName = aliasParts[1] ?? importedName;
        bindings.set(localName, {
          module,
          kind: 'named',
          importedName
        });
      }
    }

    const defaultMatch = text.match(/^import\s+([A-Za-z_$][\w$]*)\s*(,|\s+from)/);
    if (defaultMatch?.[1] && !text.startsWith('import * as')) {
      bindings.set(defaultMatch[1], {
        module,
        kind: 'default',
        importedName: 'default'
      });
    }
  }

  return bindings;
}

function walk(node: TreeSitterSyntaxNode, visit: (node: TreeSitterSyntaxNode) => void) {
  visit(node);
  for (const child of node.namedChildren) {
    walk(child, visit);
  }
}

function tryResolveImportedSymbol(args: {
  targetFile: FileWithRecords;
  binding: ImportBinding;
  propertyName?: string;
}): string | null {
  const { targetFile, binding, propertyName } = args;

  if (binding.kind === 'namespace') {
    if (!propertyName) return null;
    const namespaceTarget = targetFile.symbols.find((symbol) => symbol.name === propertyName);
    return namespaceTarget?.id ?? null;
  }

  if (binding.kind === 'default') {
    const defaultExport = targetFile.exports.find((entry) => entry.name === 'default');
    if (!defaultExport) return null;

    if (targetFile.symbols.length === 1) {
      return targetFile.symbols[0]?.id ?? null;
    }

    return null;
  }

  const matchedSymbol = targetFile.symbols.find(
    (symbol) => symbol.name === binding.importedName
  );
  if (matchedSymbol) return matchedSymbol.id;

  const exportExists = targetFile.exports.some((entry) => entry.name === binding.importedName);
  if (!exportExists) return null;

  return targetFile.symbols.find((symbol) => symbol.name === binding.importedName)?.id ?? null;
}

function extractEdgesForSymbol(args: {
  declarationNode: TreeSitterSyntaxNode;
  fromSymbolId: string;
  currentFile: FileWithRecords;
  importBindings: Map<string, ImportBinding>;
  filesByPath: Map<string, FileWithRecords>;
  knownFiles: Set<string>;
}): SymbolEdge[] {
  const edges = new Map<string, SymbolEdge>();

  const addEdge = (toSymbolId: string) => {
    const key = `${args.fromSymbolId}:${toSymbolId}`;
    if (!edges.has(key)) {
      edges.set(key, {
        fromSymbolId: args.fromSymbolId,
        toSymbolId
      });
    }
  };

  const resolveLocalIdentifier = (identifier: string) => {
    const localTarget = args.currentFile.symbols.find((symbol) => symbol.name === identifier);
    if (localTarget) {
      addEdge(localTarget.id);
      return;
    }

    const binding = args.importBindings.get(identifier);
    if (!binding) return;

    const resolvedPath = resolveModuleSpecifier(
      args.currentFile.path,
      binding.module,
      args.knownFiles
    );
    if (!resolvedPath) return;

    const targetFile = args.filesByPath.get(resolvedPath);
    if (!targetFile) return;

    const toSymbolId = tryResolveImportedSymbol({ targetFile, binding });
    if (toSymbolId) addEdge(toSymbolId);
  };

  const resolveMemberExpression = (node: TreeSitterSyntaxNode) => {
    const objectNode = node.childForFieldName('object');
    const propertyNode = node.childForFieldName('property') ?? node.childForFieldName('attribute');
    if (!objectNode) return;

    const objectName = nodeText(args.currentFile.content, objectNode).trim();
    const propertyName = propertyNode
      ? nodeText(args.currentFile.content, propertyNode).trim()
      : undefined;

    const localTarget = args.currentFile.symbols.find((symbol) => symbol.name === objectName);
    if (localTarget) {
      addEdge(localTarget.id);
      return;
    }

    const binding = args.importBindings.get(objectName);
    if (!binding) return;

    const resolvedPath = resolveModuleSpecifier(
      args.currentFile.path,
      binding.module,
      args.knownFiles
    );
    if (!resolvedPath) return;

    const targetFile = args.filesByPath.get(resolvedPath);
    if (!targetFile) return;

    const toSymbolId = tryResolveImportedSymbol({ targetFile, binding, propertyName });
    if (toSymbolId) addEdge(toSymbolId);
  };

  walk(args.declarationNode, (node) => {
    if (node.type === 'call_expression' || node.type === 'call') {
      const expressionNode = node.childForFieldName('function') ?? node.childForFieldName('expression');
      if (!expressionNode) return;

      if (expressionNode.type === 'identifier') {
        resolveLocalIdentifier(nodeText(args.currentFile.content, expressionNode).trim());
        return;
      }

      if (expressionNode.type === 'member_expression' || expressionNode.type === 'attribute') {
        resolveMemberExpression(expressionNode);
      }
      return;
    }

    if (node.type === 'member_expression' || node.type === 'attribute') {
      resolveMemberExpression(node);
    }
  });

  return Array.from(edges.values());
}

async function replaceDependenciesForFile(args: {
  repositoryId: string;
  revisionId: string;
  file: FileWithRecords;
  symbolEdges: SymbolEdge[];
  moduleEdges: ModuleEdge[];
}) {
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `
        DELETE FROM "SymbolDependency"
        WHERE "revisionId" = $1
          AND "fromSymbolId" IN (
          SELECT id FROM "Symbol" WHERE "fileId" = $2
        )
      `,
      args.revisionId,
      args.file.id
    );

    await tx.$executeRawUnsafe(
      `
        DELETE FROM "ModuleDependency"
        WHERE "revisionId" = $1 AND "fromModule" = $2
      `,
      args.revisionId,
      args.file.path
    );

    for (const edge of args.symbolEdges) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO "SymbolDependency" ("revisionId", "fromSymbolId", "toSymbolId")
          VALUES ($1, $2, $3)
          ON CONFLICT ("revisionId", "fromSymbolId", "toSymbolId") DO NOTHING
        `,
        args.revisionId,
        edge.fromSymbolId,
        edge.toSymbolId
      );
    }

    for (const edge of args.moduleEdges) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO "ModuleDependency" ("repositoryId", "revisionId", "fromModule", "toModule")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("revisionId", "fromModule", "toModule") DO NOTHING
        `,
        args.repositoryId,
        args.revisionId,
        edge.fromModule,
        edge.toModule
      );
    }
  }, prismaInteractiveTxOptions);
}

function countCycles(adjacency: Map<string, Set<string>>): number {
  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let cycleCount = 0;

  function strongConnect(node: string) {
    indices.set(node, index);
    lowLinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!indices.has(neighbor)) {
        strongConnect(neighbor);
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node) ?? Number.MAX_SAFE_INTEGER, lowLinks.get(neighbor) ?? 0)
        );
      } else if (onStack.has(neighbor)) {
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node) ?? Number.MAX_SAFE_INTEGER, indices.get(neighbor) ?? 0)
        );
      }
    }

    if (lowLinks.get(node) === indices.get(node)) {
      const component: string[] = [];
      let current: string | undefined;
      do {
        current = stack.pop();
        if (!current) break;
        onStack.delete(current);
        component.push(current);
      } while (current !== node);

      const selfLoop =
        component.length === 1 &&
        adjacency.get(component[0])?.has(component[0]) === true;
      if (component.length > 1 || selfLoop) {
        cycleCount += 1;
      }
    }
  }

  for (const node of adjacency.keys()) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return cycleCount;
}

export async function buildDependencyGraph(args: {
  repositoryId: string;
  revisionSha?: string;
}): Promise<BuildDependencyGraphResult> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) {
    throw new Error(`No repository revision found for repository ${args.repositoryId}`);
  }

  const prisma = getPrisma();
  const fileDelegate = prisma as unknown as {
    file: {
      findMany: (query: unknown) => Promise<FileWithRecords[]>;
    };
  };
  const files = await fileDelegate.file.findMany({
    where: {
      repositoryId: args.repositoryId,
      revisionId: revision.id
    },
    include: {
      symbols: true,
      exports: true
    },
    orderBy: { path: 'asc' }
  });

  logEvent('graph.build.started', {
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha: revision.revisionSha,
    filesDiscovered: files.length
  });

  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const knownFiles = new Set(files.map((file) => file.path));

  let symbolEdgesAdded = 0;
  let moduleEdgesAdded = 0;
  let filesProcessed = 0;
  const adjacency = new Map<string, Set<string>>();

  for (const file of files) {
    const parser = createTreeSitterParser(file.path);
    const tree = parser.parse(file.content);
    const root = tree.rootNode as TreeSitterSyntaxNode;
    const declarationNodes = getDeclarationNodes(root);
    const declarationsByKey = new Map<string, TreeSitterSyntaxNode>();

    for (const entry of declarationNodes) {
      declarationsByKey.set(
        symbolKey({
          type: entry.type,
          name: nodeText(file.content, entry.node.childForFieldName('name') ?? entry.node).trim(),
          startLine: entry.node.startPosition.row + 1,
          endLine: Math.max(entry.node.endPosition.row + 1, entry.node.startPosition.row + 1)
        }),
        entry.node
      );
    }

    const importBindings = extractImportBindings(root, file.content, file.path);
    const symbolEdges = new Map<string, SymbolEdge>();
    const moduleEdges = new Map<string, ModuleEdge>();

    for (const symbol of file.symbols) {
      const declarationNode = declarationsByKey.get(
        symbolKey({
          type: symbol.type,
          name: symbol.name,
          startLine: symbol.startLine,
          endLine: symbol.endLine
        })
      );
      if (!declarationNode) continue;

      const edges = extractEdgesForSymbol({
        declarationNode,
        fromSymbolId: symbol.id,
        currentFile: file,
        importBindings,
        filesByPath,
        knownFiles
      });

      for (const edge of edges) {
        const key = `${edge.fromSymbolId}:${edge.toSymbolId}`;
        symbolEdges.set(key, edge);

        if (!adjacency.has(edge.fromSymbolId)) {
          adjacency.set(edge.fromSymbolId, new Set<string>());
        }
        adjacency.get(edge.fromSymbolId)?.add(edge.toSymbolId);
      }
    }

    for (const binding of importBindings.values()) {
      const resolvedModule =
        resolveModuleSpecifier(file.path, binding.module, knownFiles) ?? binding.module;
      const key = `${file.path}:${resolvedModule}`;
      moduleEdges.set(key, {
        fromModule: file.path,
        toModule: resolvedModule
      });
    }

    await replaceDependenciesForFile({
      repositoryId: args.repositoryId,
      revisionId: revision.id,
      file,
      symbolEdges: Array.from(symbolEdges.values()),
      moduleEdges: Array.from(moduleEdges.values())
    });

    symbolEdgesAdded += symbolEdges.size;
    moduleEdgesAdded += moduleEdges.size;
    filesProcessed += 1;

    logEvent('graph.fileProcessed', {
      repositoryId: args.repositoryId,
      revisionId: revision.id,
      revisionSha: revision.revisionSha,
      filePath: file.path,
      symbolEdges: symbolEdges.size,
      moduleEdges: moduleEdges.size
    });
  }

  const cyclesDetected = countCycles(adjacency);
  if (cyclesDetected > 0) {
    logEvent('graph.cycleDetected', {
      repositoryId: args.repositoryId,
      revisionId: revision.id,
      revisionSha: revision.revisionSha,
      cyclesDetected
    });
  }

  logEvent('graph.build.completed', {
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha: revision.revisionSha,
    filesProcessed,
    symbolEdgesAdded,
    moduleEdgesAdded,
    cyclesDetected,
    averageFanOut: filesProcessed === 0 ? 0 : symbolEdgesAdded / filesProcessed
  });

  return {
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha: revision.revisionSha,
    filesProcessed,
    symbolEdgesAdded,
    moduleEdgesAdded,
    cyclesDetected
  };
}
