"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDependencyGraph = buildDependencyGraph;
const node_path_1 = __importDefault(require("node:path"));
const prisma_1 = require("../db/prisma");
const treeSitterParser_1 = require("../repo/treeSitterParser");
const repositoryRevisions_1 = require("./repositoryRevisions");
function logEvent(event, fields) {
    console.log(JSON.stringify({
        event,
        ...fields
    }));
}
function nodeText(code, node) {
    return code.slice(node.startIndex, node.endIndex);
}
function normalizePath(filePath) {
    return node_path_1.default.posix.normalize(filePath);
}
function declarationTypeForNode(node) {
    switch (node.type) {
        case 'function_declaration':
            return 'function';
        case 'class_declaration':
            return 'class';
        case 'interface_declaration':
            return 'interface';
        case 'type_alias_declaration':
            return 'type';
        default:
            return null;
    }
}
function symbolKey(args) {
    return `${args.type}:${args.name}:${args.startLine}:${args.endLine}`;
}
function getDeclarationNodes(root) {
    const declarations = [];
    for (const child of root.namedChildren) {
        if (child.type === 'export_statement') {
            for (const nested of child.namedChildren) {
                const type = declarationTypeForNode(nested);
                if (type)
                    declarations.push({ node: nested, type });
            }
            continue;
        }
        const type = declarationTypeForNode(child);
        if (type)
            declarations.push({ node: child, type });
    }
    return declarations;
}
function extractImportBindings(root, code) {
    const bindings = new Map();
    for (const child of root.namedChildren) {
        if (child.type !== 'import_statement')
            continue;
        const text = nodeText(code, child);
        const moduleMatch = text.match(/from\s+['"]([^'"]+)['"]/) ?? text.match(/import\s+['"]([^'"]+)['"]/);
        const module = moduleMatch?.[1];
        if (!module)
            continue;
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
                if (!cleaned)
                    continue;
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
function resolveModuleSpecifier(fromFilePath, moduleSpecifier, knownFiles) {
    if (!moduleSpecifier.startsWith('.')) {
        return null;
    }
    const baseDir = node_path_1.default.posix.dirname(fromFilePath);
    const resolvedBase = normalizePath(node_path_1.default.posix.join(baseDir, moduleSpecifier));
    const candidates = new Set([
        resolvedBase,
        `${resolvedBase}.ts`,
        `${resolvedBase}.tsx`,
        `${resolvedBase}.js`,
        `${resolvedBase}.jsx`,
        normalizePath(node_path_1.default.posix.join(resolvedBase, 'index.ts')),
        normalizePath(node_path_1.default.posix.join(resolvedBase, 'index.tsx')),
        normalizePath(node_path_1.default.posix.join(resolvedBase, 'index.js')),
        normalizePath(node_path_1.default.posix.join(resolvedBase, 'index.jsx'))
    ]);
    for (const candidate of candidates) {
        if (knownFiles.has(candidate)) {
            return candidate;
        }
    }
    return null;
}
function walk(node, visit) {
    visit(node);
    for (const child of node.namedChildren) {
        walk(child, visit);
    }
}
function tryResolveImportedSymbol(args) {
    const { targetFile, binding, propertyName } = args;
    if (binding.kind === 'namespace') {
        if (!propertyName)
            return null;
        const namespaceTarget = targetFile.symbols.find((symbol) => symbol.name === propertyName);
        return namespaceTarget?.id ?? null;
    }
    if (binding.kind === 'default') {
        const defaultExport = targetFile.exports.find((entry) => entry.name === 'default');
        if (!defaultExport)
            return null;
        if (targetFile.symbols.length === 1) {
            return targetFile.symbols[0]?.id ?? null;
        }
        return null;
    }
    const matchedSymbol = targetFile.symbols.find((symbol) => symbol.name === binding.importedName);
    if (matchedSymbol)
        return matchedSymbol.id;
    const exportExists = targetFile.exports.some((entry) => entry.name === binding.importedName);
    if (!exportExists)
        return null;
    return targetFile.symbols.find((symbol) => symbol.name === binding.importedName)?.id ?? null;
}
function extractEdgesForSymbol(args) {
    const edges = new Map();
    const addEdge = (toSymbolId) => {
        const key = `${args.fromSymbolId}:${toSymbolId}`;
        if (!edges.has(key)) {
            edges.set(key, {
                fromSymbolId: args.fromSymbolId,
                toSymbolId
            });
        }
    };
    const resolveLocalIdentifier = (identifier) => {
        const localTarget = args.currentFile.symbols.find((symbol) => symbol.name === identifier);
        if (localTarget) {
            addEdge(localTarget.id);
            return;
        }
        const binding = args.importBindings.get(identifier);
        if (!binding)
            return;
        const resolvedPath = resolveModuleSpecifier(args.currentFile.path, binding.module, args.knownFiles);
        if (!resolvedPath)
            return;
        const targetFile = args.filesByPath.get(resolvedPath);
        if (!targetFile)
            return;
        const toSymbolId = tryResolveImportedSymbol({ targetFile, binding });
        if (toSymbolId)
            addEdge(toSymbolId);
    };
    const resolveMemberExpression = (node) => {
        const objectNode = node.childForFieldName('object');
        const propertyNode = node.childForFieldName('property');
        if (!objectNode)
            return;
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
        if (!binding)
            return;
        const resolvedPath = resolveModuleSpecifier(args.currentFile.path, binding.module, args.knownFiles);
        if (!resolvedPath)
            return;
        const targetFile = args.filesByPath.get(resolvedPath);
        if (!targetFile)
            return;
        const toSymbolId = tryResolveImportedSymbol({ targetFile, binding, propertyName });
        if (toSymbolId)
            addEdge(toSymbolId);
    };
    walk(args.declarationNode, (node) => {
        if (node.type === 'call_expression') {
            const expressionNode = node.childForFieldName('function') ?? node.childForFieldName('expression');
            if (!expressionNode)
                return;
            if (expressionNode.type === 'identifier') {
                resolveLocalIdentifier(nodeText(args.currentFile.content, expressionNode).trim());
                return;
            }
            if (expressionNode.type === 'member_expression') {
                resolveMemberExpression(expressionNode);
            }
            return;
        }
        if (node.type === 'member_expression') {
            resolveMemberExpression(node);
        }
    });
    return Array.from(edges.values());
}
async function replaceDependenciesForFile(args) {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
        DELETE FROM "SymbolDependency"
        WHERE "revisionId" = $1
          AND "fromSymbolId" IN (
          SELECT id FROM "Symbol" WHERE "fileId" = $2
        )
      `, args.revisionId, args.file.id);
        await tx.$executeRawUnsafe(`
        DELETE FROM "ModuleDependency"
        WHERE "revisionId" = $1 AND "fromModule" = $2
      `, args.revisionId, args.file.path);
        for (const edge of args.symbolEdges) {
            await tx.$executeRawUnsafe(`
          INSERT INTO "SymbolDependency" ("revisionId", "fromSymbolId", "toSymbolId")
          VALUES ($1, $2, $3)
          ON CONFLICT ("revisionId", "fromSymbolId", "toSymbolId") DO NOTHING
        `, args.revisionId, edge.fromSymbolId, edge.toSymbolId);
        }
        for (const edge of args.moduleEdges) {
            await tx.$executeRawUnsafe(`
          INSERT INTO "ModuleDependency" ("repositoryId", "revisionId", "fromModule", "toModule")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("revisionId", "fromModule", "toModule") DO NOTHING
        `, args.repositoryId, args.revisionId, edge.fromModule, edge.toModule);
        }
    });
}
function countCycles(adjacency) {
    let index = 0;
    const indices = new Map();
    const lowLinks = new Map();
    const stack = [];
    const onStack = new Set();
    let cycleCount = 0;
    function strongConnect(node) {
        indices.set(node, index);
        lowLinks.set(node, index);
        index += 1;
        stack.push(node);
        onStack.add(node);
        for (const neighbor of adjacency.get(node) ?? []) {
            if (!indices.has(neighbor)) {
                strongConnect(neighbor);
                lowLinks.set(node, Math.min(lowLinks.get(node) ?? Number.MAX_SAFE_INTEGER, lowLinks.get(neighbor) ?? 0));
            }
            else if (onStack.has(neighbor)) {
                lowLinks.set(node, Math.min(lowLinks.get(node) ?? Number.MAX_SAFE_INTEGER, indices.get(neighbor) ?? 0));
            }
        }
        if (lowLinks.get(node) === indices.get(node)) {
            const component = [];
            let current;
            do {
                current = stack.pop();
                if (!current)
                    break;
                onStack.delete(current);
                component.push(current);
            } while (current !== node);
            const selfLoop = component.length === 1 &&
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
async function buildDependencyGraph(args) {
    const revision = await (0, repositoryRevisions_1.resolveRepositoryRevision)({
        repositoryId: args.repositoryId,
        revisionSha: args.revisionSha
    });
    if (!revision) {
        throw new Error(`No repository revision found for repository ${args.repositoryId}`);
    }
    const prisma = (0, prisma_1.getPrisma)();
    const fileDelegate = prisma;
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
    const adjacency = new Map();
    for (const file of files) {
        const parser = (0, treeSitterParser_1.createTreeSitterParser)(file.path);
        const tree = parser.parse(file.content);
        const root = tree.rootNode;
        const declarationNodes = getDeclarationNodes(root);
        const declarationsByKey = new Map();
        for (const entry of declarationNodes) {
            declarationsByKey.set(symbolKey({
                type: entry.type,
                name: nodeText(file.content, entry.node.childForFieldName('name') ?? entry.node).trim(),
                startLine: entry.node.startPosition.row + 1,
                endLine: Math.max(entry.node.endPosition.row + 1, entry.node.startPosition.row + 1)
            }), entry.node);
        }
        const importBindings = extractImportBindings(root, file.content);
        const symbolEdges = new Map();
        const moduleEdges = new Map();
        for (const symbol of file.symbols) {
            const declarationNode = declarationsByKey.get(symbolKey({
                type: symbol.type,
                name: symbol.name,
                startLine: symbol.startLine,
                endLine: symbol.endLine
            }));
            if (!declarationNode)
                continue;
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
                    adjacency.set(edge.fromSymbolId, new Set());
                }
                adjacency.get(edge.fromSymbolId)?.add(edge.toSymbolId);
            }
        }
        for (const binding of importBindings.values()) {
            const resolvedModule = resolveModuleSpecifier(file.path, binding.module, knownFiles) ?? binding.module;
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
