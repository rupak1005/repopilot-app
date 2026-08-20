import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLLMProvider, resolveLLMProviderKind } from './llmProvider';

describe('resolveLLMProviderKind', () => {
  const saved = {
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL
  };

  beforeEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('respects explicit LLM_PROVIDER', () => {
    process.env.LLM_PROVIDER = 'local';
    expect(resolveLLMProviderKind()).toBe('local');
  });

  it('falls back to local when no provider env is set', () => {
    expect(resolveLLMProviderKind()).toBe('local');
  });
});

describe('createLLMProvider', () => {
  it('returns local fallback provider by default', async () => {
    const provider = createLLMProvider('local');
    const response = await provider.createStructuredResponse({
      messages: [{ role: 'user', content: 'hello' }],
      schema: { name: 'demo', schema: { type: 'object' } }
    });
    expect(response.provider).toBe('local-fallback');
    expect(() => JSON.parse(response.content)).not.toThrow();
  });
});
