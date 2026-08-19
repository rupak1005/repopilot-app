"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLLMProvider = exports.OpenAILLMProvider = void 0;
exports.loadPromptTemplate = loadPromptTemplate;
exports.getDefaultLLMProvider = getDefaultLLMProvider;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
async function loadPromptTemplate(fileName) {
    const promptPath = node_path_1.default.resolve(__dirname, '../../../prompts', fileName);
    return promises_1.default.readFile(promptPath, 'utf8');
}
class OpenAILLMProvider {
    constructor(apiKey, model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini') {
        this.apiKey = apiKey;
        this.model = model;
    }
    async createStructuredResponse(args) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: args.messages,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: args.schema.name,
                        strict: true,
                        schema: args.schema.schema
                    }
                }
            })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`LLM request failed: ${response.status} ${errorBody}`);
        }
        const payload = (await response.json());
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('LLM response did not contain content');
        }
        return {
            provider: `openai:${this.model}`,
            content,
            usage: {
                totalTokens: payload.usage?.total_tokens
            }
        };
    }
}
exports.OpenAILLMProvider = OpenAILLMProvider;
class LocalLLMProvider {
    async createStructuredResponse(args) {
        const userMessage = args.messages
            .filter((message) => message.role === 'user')
            .map((message) => message.content)
            .join('\n');
        const answer = {
            answer: 'This is a locally generated grounded answer. Review the cited snippets for the best available match.',
            confidence: 'LOW',
            citations: [],
            notes: [userMessage.slice(0, 240)]
        };
        return {
            provider: 'local-fallback',
            content: JSON.stringify(answer)
        };
    }
}
exports.LocalLLMProvider = LocalLLMProvider;
function getDefaultLLMProvider() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
        return new OpenAILLMProvider(apiKey);
    }
    return new LocalLLMProvider();
}
