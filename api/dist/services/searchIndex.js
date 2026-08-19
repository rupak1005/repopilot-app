"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkText = chunkText;
exports.indexRepositorySearch = indexRepositorySearch;
exports.searchRepository = searchRepository;
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_1 = require("../db/prisma");
const repositoryRevisions_1 = require("./repositoryRevisions");
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_CHUNK_LINES = 40;
const CHUNK_OVERLAP_LINES = 8;
const EMBEDDING_BATCH_SIZE = 50;
function logEvent(event, fields) {
    console.log(JSON.stringify({
        event,
        ...fields
    }));
}
function chunkText(text) {
    const lines = text.split('\n');
    if (lines.length === 0)
        return [];
    const chunks = [];
    let start = 0;
    while (start < lines.length) {
        const end = Math.min(start + MAX_CHUNK_LINES, lines.length);
        const chunkLines = lines.slice(start, end);
        const chunkTextValue = chunkLines.join('\n').trim();
        if (chunkTextValue) {
            chunks.push({
                startLine: start + 1,
                endLine: end,
                text: chunkTextValue
            });
        }
        if (end >= lines.length)
            break;
        start = Math.max(start + 1, end - CHUNK_OVERLAP_LINES);
    }
    return chunks;
}
function vectorLiteral(values) {
    return `[${values.map((value) => Number(value.toFixed(8))).join(',')}]`;
}
function normalizeVector(values) {
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    if (!norm)
        return values;
    return values.map((value) => value / norm);
}
function localEmbedding(text) {
    const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
    const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
    for (const token of tokens) {
        const hash = node_crypto_1.default.createHash('sha256').update(token).digest();
        const index = hash.readUInt16BE(0) % EMBEDDING_DIMENSIONS;
        const direction = hash[2] % 2 === 0 ? 1 : -1;
        values[index] += direction * Math.max(1, token.length / 4);
    }
    return normalizeVector(values);
}
async function createEmbeddings(texts) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return {
            provider: 'local-hash',
            embeddings: texts.map((text) => localEmbedding(text))
        };
    }
    const embeddings = [];
    for (let idx = 0; idx < texts.length; idx += EMBEDDING_BATCH_SIZE) {
        const batch = texts.slice(idx, idx + EMBEDDING_BATCH_SIZE);
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                input: batch,
                dimensions: EMBEDDING_DIMENSIONS,
                encoding_format: 'float'
            })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Embedding request failed: ${response.status} ${errorBody}`);
        }
        const payload = (await response.json());
        for (const row of payload.data) {
            embeddings.push(row.embedding);
        }
    }
    return {
        provider: `openai:${EMBEDDING_MODEL}`,
        embeddings
    };
}
async function indexRepositorySearch(args) {
    const revision = await (0, repositoryRevisions_1.resolveRepositoryRevision)({
        repositoryId: args.repositoryId,
        revisionSha: args.revisionSha
    });
    if (!revision) {
        throw new Error(`No repository revision found for repository ${args.repositoryId}`);
    }
    const prisma = (0, prisma_1.getPrisma)();
    const files = (await prisma.$queryRawUnsafe(`
      SELECT "id", "path", "content"
      FROM "File"
      WHERE "repositoryId" = $1
        AND "revisionId" = $2
      ORDER BY "path" ASC
    `, args.repositoryId, revision.id));
    logEvent('search.indexing.start', {
        repositoryId: args.repositoryId,
        revisionId: revision.id,
        revisionSha: revision.revisionSha,
        filesDiscovered: files.length
    });
    const pendingChunks = [];
    for (const file of files) {
        for (const chunk of chunkText(file.content)) {
            pendingChunks.push({
                fileId: file.id,
                filePath: file.path,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                text: chunk.text
            });
        }
    }
    const embeddingResult = await createEmbeddings(pendingChunks.map((chunk) => chunk.text));
    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
        DELETE FROM "CodeChunk"
        WHERE "revisionId" = $1
      `, revision.id);
        for (let idx = 0; idx < pendingChunks.length; idx += 1) {
            const chunk = pendingChunks[idx];
            const embedding = embeddingResult.embeddings[idx] ?? localEmbedding(chunk.text);
            await tx.$executeRawUnsafe(`
          INSERT INTO "CodeChunk" (
            "repositoryId",
            "revisionId",
            "fileId",
            "filePath",
            "startLine",
            "endLine",
            "chunkType",
            "text",
            "embedding"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
        `, args.repositoryId, revision.id, chunk.fileId, chunk.filePath, chunk.startLine, chunk.endLine, 'lines', chunk.text, vectorLiteral(embedding));
        }
    });
    logEvent('search.indexing.completed', {
        repositoryId: args.repositoryId,
        revisionId: revision.id,
        revisionSha: revision.revisionSha,
        provider: embeddingResult.provider,
        chunksIndexed: pendingChunks.length
    });
    return {
        repositoryId: args.repositoryId,
        revisionId: revision.id,
        revisionSha: revision.revisionSha,
        chunksIndexed: pendingChunks.length,
        provider: embeddingResult.provider
    };
}
async function loadGraphBoosts(args) {
    const prisma = (0, prisma_1.getPrisma)();
    if (args.filePaths.length === 0)
        return new Map();
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT "toModule", COUNT(*)::int AS count
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
        AND "toModule" = ANY($2::text[])
      GROUP BY "toModule"
    `, args.revisionId, args.filePaths));
    return new Map(rows.map((row) => [row.toModule, row.count]));
}
async function lexicalSearch(args) {
    const prisma = (0, prisma_1.getPrisma)();
    return (await prisma.$queryRawUnsafe(`
      SELECT
        "id",
        "filePath",
        "startLine",
        "endLine",
        "text",
        ts_rank_cd("searchVector", websearch_to_tsquery('english', $2)) AS rank
      FROM "CodeChunk"
      WHERE "revisionId" = $1
        AND "searchVector" @@ websearch_to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT $3
    `, args.revisionId, args.query, args.limit));
}
async function semanticSearch(args) {
    const prisma = (0, prisma_1.getPrisma)();
    return (await prisma.$queryRawUnsafe(`
      SELECT
        "id",
        "filePath",
        "startLine",
        "endLine",
        "text",
        "embedding" <=> $2::vector AS distance
      FROM "CodeChunk"
      WHERE "revisionId" = $1
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> $2::vector
      LIMIT $3
    `, args.revisionId, vectorLiteral(args.queryEmbedding), args.limit));
}
async function searchRepository(args) {
    const query = args.query.trim();
    if (!query) {
        return { results: [] };
    }
    const revision = await (0, repositoryRevisions_1.resolveRepositoryRevision)({
        repositoryId: args.repositoryId,
        revisionSha: args.revisionSha
    });
    if (!revision) {
        return { results: [] };
    }
    const topK = Math.max(1, Math.min(args.topK ?? 5, 20));
    const embeddingResult = await createEmbeddings([query]);
    const queryEmbedding = embeddingResult.embeddings[0] ?? localEmbedding(query);
    const [lexicalResults, semanticResults] = await Promise.all([
        lexicalSearch({
            revisionId: revision.id,
            query,
            limit: topK * 2
        }),
        semanticSearch({
            revisionId: revision.id,
            queryEmbedding,
            limit: topK * 2
        })
    ]);
    const merged = new Map();
    const upsertResult = (row, source, scoreDelta) => {
        const key = `${row.filePath}:${row.startLine}:${row.endLine}`;
        const existing = merged.get(key);
        if (existing) {
            existing.score += scoreDelta;
            if (!existing.sources.includes(source))
                existing.sources.push(source);
            return;
        }
        merged.set(key, {
            file: row.filePath,
            lines: [row.startLine, row.endLine],
            text: row.text,
            score: scoreDelta,
            sources: [source]
        });
    };
    lexicalResults.forEach((row, idx) => {
        upsertResult(row, 'lexical', (row.rank ?? 0) + 1 / (idx + 1));
    });
    semanticResults.forEach((row, idx) => {
        const semanticScore = 1 / (1 + (row.distance ?? 1)) + 1 / (idx + 2);
        upsertResult(row, 'semantic', semanticScore);
    });
    const graphBoosts = await loadGraphBoosts({
        revisionId: revision.id,
        filePaths: Array.from(new Set(Array.from(merged.values()).map((result) => result.file)))
    });
    for (const result of merged.values()) {
        const graphBoost = (graphBoosts.get(result.file) ?? 0) * 0.05;
        if (graphBoost > 0) {
            result.score += graphBoost;
            if (!result.sources.includes('graph')) {
                result.sources.push('graph');
            }
        }
    }
    return {
        results: Array.from(merged.values())
            .sort((left, right) => right.score - left.score)
            .slice(0, topK)
    };
}
