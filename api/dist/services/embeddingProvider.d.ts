export declare const EMBEDDING_DIMENSIONS = 1536;
export type EmbeddingProviderKind = 'openai' | 'ollama' | 'local';
export declare function resolveEmbeddingProviderKind(): EmbeddingProviderKind;
/** ponytail: pad/truncate to 1536 — Ollama nomic-embed is 768d; quality ceiling vs native OpenAI dims */
export declare function fitEmbeddingDimensions(values: number[], dimensions?: number): number[];
export declare function localEmbedding(text: string): number[];
export declare function createEmbeddings(texts: string[]): Promise<{
    provider: string;
    embeddings: number[][];
}>;
