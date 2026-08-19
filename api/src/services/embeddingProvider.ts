import crypto from 'node:crypto';

export const EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingProviderKind = 'openai' | 'ollama' | 'local';

export function resolveEmbeddingProviderKind(): EmbeddingProviderKind {
  const explicit = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (explicit === 'openai' || explicit === 'ollama' || explicit === 'local') {
    return explicit;
  }
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.OLLAMA_BASE_URL) return 'ollama';
  return 'local';
}

function normalizeVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return values;
  return values.map((value) => value / norm);
}

/** ponytail: pad/truncate to 1536 — Ollama nomic-embed is 768d; quality ceiling vs native OpenAI dims */
export function fitEmbeddingDimensions(values: number[], dimensions = EMBEDDING_DIMENSIONS): number[] {
  if (values.length === dimensions) return normalizeVector(values);
  if (values.length > dimensions) return normalizeVector(values.slice(0, dimensions));
  return normalizeVector([...values, ...Array(dimensions - values.length).fill(0)]);
}

export function localEmbedding(text: string): number[] {
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

async function openAIEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY required for openai embeddings');

  const model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
  const batchSize = 50;
  const embeddings: number[][] = [];

  for (let idx = 0; idx < texts.length; idx += batchSize) {
    const batch = texts.slice(idx, idx + batchSize);
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const err = new Error(`Embedding request failed: ${response.status} ${errorBody}`);
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }

    const payload = (await response.json()) as { data: Array<{ embedding: number[] }> };
    for (const row of payload.data) {
      embeddings.push(row.embedding);
    }
  }

  return embeddings;
}

async function ollamaEmbeddings(texts: string[]): Promise<number[][]> {
  const base = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/v1\/?$/, '');
  const model = process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text';
  const embeddings: number[][] = [];

  for (const text of texts) {
    const response = await fetch(`${base}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama embedding failed: ${response.status} ${errorBody}`);
    }

    const payload = (await response.json()) as { embedding?: number[] };
    if (!payload.embedding?.length) {
      throw new Error('Ollama embedding response missing vector');
    }
    embeddings.push(fitEmbeddingDimensions(payload.embedding));
  }

  return embeddings;
}

function isQuotaOrAuthError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const status = (err as Error & { status?: number }).status;
  return status === 401 || status === 402 || status === 429 || /insufficient_quota|quota|billing/i.test(message);
}

export async function createEmbeddings(texts: string[]): Promise<{
  provider: string;
  embeddings: number[][];
}> {
  const kind = resolveEmbeddingProviderKind();

  if (kind === 'local') {
    return {
      provider: 'local-hash',
      embeddings: texts.map((text) => localEmbedding(text))
    };
  }

  try {
    if (kind === 'ollama') {
      return {
        provider: `ollama:${process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text'}`,
        embeddings: await ollamaEmbeddings(texts)
      };
    }

    const model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
    return {
      provider: `openai:${model}`,
      embeddings: await openAIEmbeddings(texts)
    };
  } catch (err) {
    if (kind === 'openai' && isQuotaOrAuthError(err)) {
      console.warn(
        JSON.stringify({
          event: 'embedding.fallback',
          reason: err instanceof Error ? err.message : String(err),
          fallback: 'local-hash'
        })
      );
      return {
        provider: 'local-hash',
        embeddings: texts.map((text) => localEmbedding(text))
      };
    }
    throw err;
  }
}
