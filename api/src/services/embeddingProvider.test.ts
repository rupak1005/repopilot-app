import { describe, expect, it } from 'vitest';
import { fitEmbeddingDimensions, localEmbedding, resolveEmbeddingProviderKind } from './embeddingProvider';
import { resolveLLMProviderKind } from './llmProvider';

describe('embeddingProvider', () => {
  it('pads Ollama-sized vectors to 1536 dimensions', () => {
    const padded = fitEmbeddingDimensions(Array.from({ length: 768 }, (_, i) => i / 768));
    expect(padded).toHaveLength(1536);
  });

  it('localEmbedding returns normalized 1536-d vector', () => {
    const vec = localEmbedding('repository sync handler');
    expect(vec).toHaveLength(1536);
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('defaults embedding provider to local without keys', () => {
    const prev = { ...process.env };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.EMBEDDING_PROVIDER;
    expect(resolveEmbeddingProviderKind()).toBe('local');
    process.env = prev;
  });
});

describe('llmProvider resolution', () => {
  it('prefers explicit LLM_PROVIDER', () => {
    const prev = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test';
    expect(resolveLLMProviderKind()).toBe('groq');
    if (prev === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = prev;
  });
});
