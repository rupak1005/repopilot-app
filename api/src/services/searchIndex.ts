import crypto from 'node:crypto';
import { getPrisma } from '../db/prisma';
import { resolveRepositoryRevision } from './repositoryRevisions';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_CHUNK_LINES = 40;
const CHUNK_OVERLAP_LINES = 8;
const EMBEDDING_BATCH_SIZE = 50;

type FileRow = {
  id: string;
  path: string;
  content: string;
};

export type TextChunk = {
  startLine: number;
  endLine: number;
  text: string;
};

export type SearchResult = {
  file: string;
  lines: [number, number];
  text: string;
  score: number;
  sources: Array<'lexical' | 'semantic' | 'graph'>;
};

export type SearchResponse = {
  results: SearchResult[];
};

export type SearchIndexResult = {
  repositoryId: string;
  revisionId: string;
  revisionSha: string;
  chunksIndexed: number;
  provider: string;
};

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      ...fields
    })
  );
}

export function chunkText(text: string): TextChunk[] {
  const lines = text.split('\n');
  if (lines.length === 0) return [];

  const chunks: TextChunk[] = [];
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

    if (end >= lines.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP_LINES);
  }

  return chunks;
}

function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number(value.toFixed(8))).join(',')}]`;
}

function normalizeVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return values;
  return values.map((value) => value / norm);
}

function localEmbedding(text: string): number[] {
  const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];

  for (const token of tokens) {
    const hash = crypto.createHash('sha256').update(token).digest();
    const index = hash.readUInt16BE(0) % EMBEDDING_DIMENSIONS;
    const direction = hash[2] % 2 === 0 ? 1 : -1;
    values[index] += direction * Math.max(1, token.length / 4);
  }

  return normalizeVector(values);
}

async function createEmbeddings(texts: string[]): Promise<{
  provider: string;
  embeddings: number[][];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      provider: 'local-hash',
      embeddings: texts.map((text) => localEmbedding(text))
    };
  }

  const embeddings: number[][] = [];
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

    const payload = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    for (const row of payload.data) {
      embeddings.push(row.embedding);
    }
  }

  return {
    provider: `openai:${EMBEDDING_MODEL}`,
    embeddings
  };
}

export async function indexRepositorySearch(args: {
  repositoryId: string;
  revisionSha?: string;
}): Promise<SearchIndexResult> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) {
    throw new Error(`No repository revision found for repository ${args.repositoryId}`);
  }

  const prisma = getPrisma();
  const files = (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "path", "content"
      FROM "File"
      WHERE "repositoryId" = $1
        AND "revisionId" = $2
      ORDER BY "path" ASC
    `,
    args.repositoryId,
    revision.id
  )) as FileRow[];

  logEvent('search.indexing.start', {
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha: revision.revisionSha,
    filesDiscovered: files.length
  });

  const pendingChunks: Array<{
    fileId: string;
    filePath: string;
    startLine: number;
    endLine: number;
    text: string;
  }> = [];

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
    await tx.$executeRawUnsafe(
      `
        DELETE FROM "CodeChunk"
        WHERE "revisionId" = $1
      `,
      revision.id
    );

    for (let idx = 0; idx < pendingChunks.length; idx += 1) {
      const chunk = pendingChunks[idx];
      const embedding = embeddingResult.embeddings[idx] ?? localEmbedding(chunk.text);
      await tx.$executeRawUnsafe(
        `
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
        `,
        args.repositoryId,
        revision.id,
        chunk.fileId,
        chunk.filePath,
        chunk.startLine,
        chunk.endLine,
        'lines',
        chunk.text,
        vectorLiteral(embedding)
      );
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

async function loadGraphBoosts(args: {
  revisionId: string;
  filePaths: string[];
}): Promise<Map<string, number>> {
  const prisma = getPrisma();
  if (args.filePaths.length === 0) return new Map<string, number>();

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "toModule", COUNT(*)::int AS count
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
        AND "toModule" = ANY($2::text[])
      GROUP BY "toModule"
    `,
    args.revisionId,
    args.filePaths
  )) as Array<{ toModule: string; count: number }>;

  return new Map(rows.map((row) => [row.toModule, row.count]));
}

type RankedChunkRow = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  text: string;
  rank?: number;
  distance?: number;
};

async function lexicalSearch(args: {
  revisionId: string;
  query: string;
  limit: number;
}): Promise<RankedChunkRow[]> {
  const prisma = getPrisma();
  return (await prisma.$queryRawUnsafe(
    `
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
    `,
    args.revisionId,
    args.query,
    args.limit
  )) as RankedChunkRow[];
}

async function semanticSearch(args: {
  revisionId: string;
  queryEmbedding: number[];
  limit: number;
}): Promise<RankedChunkRow[]> {
  const prisma = getPrisma();
  return (await prisma.$queryRawUnsafe(
    `
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
    `,
    args.revisionId,
    vectorLiteral(args.queryEmbedding),
    args.limit
  )) as RankedChunkRow[];
}

export async function searchRepository(args: {
  repositoryId: string;
  query: string;
  topK?: number;
  revisionSha?: string;
}): Promise<SearchResponse> {
  const query = args.query.trim();
  if (!query) {
    return { results: [] };
  }

  const revision = await resolveRepositoryRevision({
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

  const merged = new Map<string, SearchResult>();

  const upsertResult = (
    row: RankedChunkRow,
    source: 'lexical' | 'semantic',
    scoreDelta: number
  ) => {
    const key = `${row.filePath}:${row.startLine}:${row.endLine}`;
    const existing = merged.get(key);
    if (existing) {
      existing.score += scoreDelta;
      if (!existing.sources.includes(source)) existing.sources.push(source);
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
