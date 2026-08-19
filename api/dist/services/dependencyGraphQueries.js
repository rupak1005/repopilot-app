"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSymbolDependencyTraversal = getSymbolDependencyTraversal;
exports.getModuleDependencyTraversal = getModuleDependencyTraversal;
exports.breadthFirstExpand = breadthFirstExpand;
exports.findStronglyConnectedComponents = findStronglyConnectedComponents;
const prisma_1 = require("../db/prisma");
const repositoryRevisions_1 = require("./repositoryRevisions");
function breadthFirstExpand(args) {
    const visited = new Set(args.startIds);
    const queue = args.startIds.map((id) => ({ id, depth: 1 }));
    const ordered = [];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current)
            continue;
        ordered.push(current.id);
        if (current.depth >= args.depthLimit)
            continue;
        for (const next of args.adjacency.get(current.id) ?? []) {
            if (visited.has(next))
                continue;
            visited.add(next);
            queue.push({ id: next, depth: current.depth + 1 });
        }
    }
    return ordered;
}
function findStronglyConnectedComponents(adjacency) {
    let index = 0;
    const indices = new Map();
    const lowLinks = new Map();
    const stack = [];
    const onStack = new Set();
    const components = [];
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
            components.push(component);
        }
    }
    for (const node of adjacency.keys()) {
        if (!indices.has(node)) {
            strongConnect(node);
        }
    }
    return components;
}
async function loadSymbolLookup(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT s.id AS "symbolId", s.name, s.type
      FROM "Symbol" s
      JOIN "File" f ON f.id = s."fileId"
      WHERE f."repositoryId" = $1
        AND f."revisionId" = $2
    `, args.repositoryId, args.revisionId));
    return new Map(rows.map((row) => [
        row.symbolId,
        {
            symbolId: row.symbolId,
            name: row.name,
            type: row.type
        }
    ]));
}
async function loadSymbolAdjacency(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT sd."fromSymbolId", sd."toSymbolId"
      FROM "SymbolDependency" sd
      WHERE sd."revisionId" = $1
    `, args.revisionId));
    const adjacency = new Map();
    for (const row of rows) {
        const from = args.reverse ? row.toSymbolId : row.fromSymbolId;
        const to = args.reverse ? row.fromSymbolId : row.toSymbolId;
        if (!adjacency.has(from))
            adjacency.set(from, new Set());
        adjacency.get(from)?.add(to);
    }
    return adjacency;
}
async function getSymbolDependencyTraversal(args) {
    const depthLimit = Math.max(1, args.depthLimit ?? 2);
    const revision = await (0, repositoryRevisions_1.resolveRepositoryRevision)({
        repositoryId: args.repositoryId,
        revisionSha: args.revisionSha
    });
    if (!revision)
        return null;
    const symbolLookup = await loadSymbolLookup({
        repositoryId: args.repositoryId,
        revisionId: revision.id
    });
    const symbol = symbolLookup.get(args.symbolId);
    if (!symbol)
        return null;
    const reverseAdjacency = await loadSymbolAdjacency({
        revisionId: revision.id,
        reverse: true
    });
    const forwardAdjacency = await loadSymbolAdjacency({
        revisionId: revision.id,
        reverse: false
    });
    const directCallerIds = Array.from(reverseAdjacency.get(args.symbolId) ?? []);
    const transitiveCallerIds = breadthFirstExpand({
        startIds: directCallerIds,
        adjacency: reverseAdjacency,
        depthLimit
    }).filter((id) => !directCallerIds.includes(id));
    const cyclicSymbolIds = new Set();
    for (const component of findStronglyConnectedComponents(forwardAdjacency)) {
        const selfLoop = component.length === 1 &&
            forwardAdjacency.get(component[0])?.has(component[0]) === true;
        if (component.length > 1 || selfLoop) {
            for (const symbolId of component) {
                cyclicSymbolIds.add(symbolId);
            }
        }
    }
    const toNodes = (ids) => ids
        .map((id) => symbolLookup.get(id))
        .filter((node) => Boolean(node));
    return {
        symbol,
        directCallers: toNodes(directCallerIds),
        transitiveCallers: toNodes(transitiveCallerIds),
        graphDepth: depthLimit,
        cycleDetected: cyclicSymbolIds.has(args.symbolId)
    };
}
async function getModuleDependencyTraversal(args) {
    const depthLimit = Math.max(1, args.depthLimit ?? 2);
    const revision = await (0, repositoryRevisions_1.resolveRepositoryRevision)({
        repositoryId: args.repositoryId,
        revisionSha: args.revisionSha
    });
    if (!revision)
        return null;
    const prisma = (0, prisma_1.getPrisma)();
    const fileRows = (await prisma.$queryRawUnsafe(`
      SELECT "id"
      FROM "File"
      WHERE "repositoryId" = $1
        AND "revisionId" = $2
        AND "path" = $3
      LIMIT 1
    `, args.repositoryId, revision.id, args.filePath));
    const file = fileRows[0];
    if (!file)
        return null;
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT "fromModule", "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
    `, revision.id));
    const adjacency = new Map();
    const reverseAdjacency = new Map();
    for (const row of rows) {
        if (!adjacency.has(row.fromModule))
            adjacency.set(row.fromModule, new Set());
        adjacency.get(row.fromModule)?.add(row.toModule);
        if (!reverseAdjacency.has(row.toModule))
            reverseAdjacency.set(row.toModule, new Set());
        reverseAdjacency.get(row.toModule)?.add(row.fromModule);
    }
    const directDependents = Array.from(reverseAdjacency.get(args.filePath) ?? []).map((fromModule) => ({
        fromModule,
        toModule: args.filePath
    }));
    const transitiveIds = breadthFirstExpand({
        startIds: directDependents.map((edge) => edge.fromModule),
        adjacency: reverseAdjacency,
        depthLimit
    }).filter((moduleName) => !directDependents.some((edge) => edge.fromModule === moduleName));
    return {
        file: {
            filePath: args.filePath
        },
        directModuleDependents: directDependents,
        transitiveModuleDependents: transitiveIds.map((fromModule) => ({
            fromModule,
            toModule: args.filePath
        })),
        graphDepth: depthLimit
    };
}
