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
export declare class OpenAILLMProvider implements LLMProvider {
    private readonly apiKey;
    private readonly model;
    constructor(apiKey: string, model?: string);
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
export declare class LocalLLMProvider implements LLMProvider {
    createStructuredResponse(args: {
        messages: ChatMessage[];
        schema: JsonSchemaSpec;
    }): Promise<{
        provider: string;
        content: string;
    }>;
}
export declare function getDefaultLLMProvider(): LLMProvider;
