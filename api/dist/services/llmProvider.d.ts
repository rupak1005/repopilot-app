export type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};
export type JsonSchemaSpec = {
    name: string;
    schema: Record<string, unknown>;
};
export interface LLMProvider {
    createStructuredResponse(args: {
        messages: ChatMessage[];
        schema: JsonSchemaSpec;
    }): Promise<{
        provider: string;
        content: string;
        usage?: {
            totalTokens?: number;
        };
    }>;
}
export declare function loadPromptTemplate(fileName: string): Promise<string>;
/** OpenAI-compatible chat API (OpenAI, Groq, Ollama /v1). */
export declare class OpenAICompatibleLLMProvider implements LLMProvider {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    private readonly providerLabel;
    private readonly useJsonSchema;
    constructor(apiKey: string, baseUrl: string, model: string, providerLabel: string, useJsonSchema: boolean);
    createStructuredResponse(args: {
        messages: ChatMessage[];
        schema: JsonSchemaSpec;
    }): Promise<{
        provider: string;
        content: string;
        usage?: {
            totalTokens?: number;
        };
    }>;
}
export declare class GeminiLLMProvider implements LLMProvider {
    private readonly apiKey;
    private readonly model;
    constructor(apiKey: string, model?: string);
    createStructuredResponse(args: {
        messages: ChatMessage[];
        schema: JsonSchemaSpec;
    }): Promise<{
        provider: string;
        content: string;
    }>;
}
export declare class LocalLLMProvider implements LLMProvider {
    createStructuredResponse(args: {
        messages: ChatMessage[];
        schema: JsonSchemaSpec;
    }): Promise<{
        provider: string;
        content: string;
    }>;
}
export type LLMProviderKind = 'openai' | 'groq' | 'gemini' | 'ollama' | 'local';
export declare function resolveLLMProviderKind(): LLMProviderKind;
export declare function createLLMProvider(kind?: LLMProviderKind): LLMProvider;
/** @deprecated use createLLMProvider */
export declare class OpenAILLMProvider extends OpenAICompatibleLLMProvider {
    constructor(apiKey: string, model?: string);
}
export declare function getDefaultLLMProvider(): LLMProvider;
