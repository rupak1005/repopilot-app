"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const embeddingProvider_1 = require("./embeddingProvider");
const llmProvider_1 = require("./llmProvider");
(0, vitest_1.describe)('embeddingProvider', () => {
    (0, vitest_1.it)('pads Ollama-sized vectors to 1536 dimensions', () => {
        const padded = (0, embeddingProvider_1.fitEmbeddingDimensions)(Array.from({ length: 768 }, (_, i) => i / 768));
        (0, vitest_1.expect)(padded).toHaveLength(1536);
    });
    (0, vitest_1.it)('localEmbedding returns normalized 1536-d vector', () => {
        const vec = (0, embeddingProvider_1.localEmbedding)('repository sync handler');
        (0, vitest_1.expect)(vec).toHaveLength(1536);
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        (0, vitest_1.expect)(norm).toBeCloseTo(1, 5);
    });
    (0, vitest_1.it)('defaults embedding provider to local without keys', () => {
        const prev = { ...process.env };
        delete process.env.OPENAI_API_KEY;
        delete process.env.OLLAMA_BASE_URL;
        delete process.env.EMBEDDING_PROVIDER;
        (0, vitest_1.expect)((0, embeddingProvider_1.resolveEmbeddingProviderKind)()).toBe('local');
        process.env = prev;
    });
});
(0, vitest_1.describe)('llmProvider resolution', () => {
    (0, vitest_1.it)('prefers explicit LLM_PROVIDER', () => {
        const prev = process.env.LLM_PROVIDER;
        process.env.LLM_PROVIDER = 'groq';
        process.env.GROQ_API_KEY = 'test';
        (0, vitest_1.expect)((0, llmProvider_1.resolveLLMProviderKind)()).toBe('groq');
        if (prev === undefined)
            delete process.env.LLM_PROVIDER;
        else
            process.env.LLM_PROVIDER = prev;
    });
});
