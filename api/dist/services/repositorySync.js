"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRepository = syncRepository;
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const fileDiscovery_1 = require("../repo/fileDiscovery");
const treeSitterParser_1 = require("../repo/treeSitterParser");
const persistence_1 = require("../repo/persistence");
const searchIndex_1 = require("./searchIndex");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
function logEvent(event, fields) {
    console.log(JSON.stringify({
        event,
        ...fields
    }));
}
async function resolveRevisionSha(args) {
    if (args.revisionSha)
        return args.revisionSha;
    try {
        const result = await execFileAsync('git', ['rev-parse', 'HEAD'], {
            cwd: args.repoPath
        });
        const sha = result.stdout.trim();
        if (sha)
            return sha;
    }
    catch {
        // Fall through to a stable manual label when syncing non-git fixtures.
    }
    return `manual-${Date.now()}`;
}
async function syncRepository(args) {
    const files = await (0, fileDiscovery_1.discoverSourceFiles)(args.repoPath);
    const revisionSha = await resolveRevisionSha({
        repoPath: args.repoPath,
        revisionSha: args.revisionSha
    });
    const repositoryName = args.repositoryName ?? node_path_1.default.basename(node_path_1.default.resolve(args.repoPath));
    const owner = args.owner ?? 'unknown';
    await (0, persistence_1.ensureRepository)({
        repositoryId: args.repositoryId,
        name: repositoryName,
        owner
    });
    const revision = await (0, persistence_1.ensureRepositoryRevision)({
        repositoryId: args.repositoryId,
        revisionSha
    });
    await (0, persistence_1.clearRevisionData)({ revisionId: revision.id });
    logEvent('repo.sync.started', {
        repositoryId: args.repositoryId,
        revisionId: revision.id,
        revisionSha,
        repoPath: args.repoPath,
        filesDiscovered: files.length,
        concurrency: args.concurrency ?? 8
    });
    const concurrency = Math.max(1, args.concurrency ?? 8);
    let idx = 0;
    let filesScanned = files.length;
    let filesParsed = 0;
    let symbolsExtracted = 0;
    let importsExtracted = 0;
    let exportsExtracted = 0;
    const workerCount = Math.min(concurrency, files.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    async function worker() {
        while (true) {
            const current = idx++;
            if (current >= files.length)
                return;
            const file = files[current];
            try {
                const code = await promises_1.default.readFile(file.absPath, 'utf8');
                const parsed = (0, treeSitterParser_1.parseCodeToRecords)(file.path, code);
                await (0, persistence_1.insertFileParsedData)({
                    repositoryId: args.repositoryId,
                    revisionId: revision.id,
                    path: file.path,
                    content: code,
                    parsed
                });
                filesParsed++;
                symbolsExtracted += parsed.symbols.length;
                importsExtracted += parsed.imports.length;
                exportsExtracted += parsed.exports.length;
                logEvent('repo.sync.fileParsed', {
                    repositoryId: args.repositoryId,
                    revisionId: revision.id,
                    revisionSha,
                    filePath: file.path,
                    symbols: parsed.symbols.length,
                    imports: parsed.imports.length,
                    exports: parsed.exports.length
                });
            }
            catch (err) {
                logEvent('repo.sync.fileParseFailed', {
                    repositoryId: args.repositoryId,
                    revisionId: revision.id,
                    revisionSha,
                    filePath: file.path,
                    error: err instanceof Error ? err.message : String(err)
                });
            }
        }
    }
    await Promise.all(workers);
    logEvent('repo.sync.completed', {
        repositoryId: args.repositoryId,
        revisionId: revision.id,
        revisionSha,
        filesScanned,
        filesParsed,
        symbolsExtracted,
        importsExtracted,
        exportsExtracted
    });
    const searchIndex = await (0, searchIndex_1.indexRepositorySearch)({
        repositoryId: args.repositoryId,
        revisionSha
    });
    return {
        repositoryId: args.repositoryId,
        revisionId: revision.id,
        revisionSha,
        filesScanned,
        filesParsed,
        symbolsExtracted,
        importsExtracted,
        exportsExtracted,
        chunksIndexed: searchIndex.chunksIndexed
    };
}
