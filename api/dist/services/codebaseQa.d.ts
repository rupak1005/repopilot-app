import { type LLMProvider } from './llmProvider';
export type AnswerCitation = {
    file: string;
    lines: [number, number];
};
export type CodebaseAnswer = {
    answer: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    citations: AnswerCitation[];
    notes?: string[];
};
type ContextSnippet = {
    file: string;
    lines: [number, number];
    text: string;
};
export declare function validateCodebaseAnswer(raw: string, snippets: ContextSnippet[]): CodebaseAnswer | null;
export declare function askCodebaseQuestion(args: {
    repositoryId: string;
    query: string;
    revisionSha?: string;
    provider?: LLMProvider;
}): Promise<CodebaseAnswer>;
export declare function evidenceExists(args: {
    repositoryId: string;
    revisionSha?: string;
    citation: AnswerCitation;
}): Promise<boolean>;
export {};
