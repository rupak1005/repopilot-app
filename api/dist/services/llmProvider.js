"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAILLMProvider = exports.LocalLLMProvider = exports.GeminiLLMProvider = exports.OpenAICompatibleLLMProvider = void 0;
exports.loadPromptTemplate = loadPromptTemplate;
exports.resolveLLMProviderKind = resolveLLMProviderKind;
exports.createLLMProvider = createLLMProvider;
exports.getDefaultLLMProvider = getDefaultLLMProvider;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
async function loadPromptTemplate(fileName) {
    const promptPath = node_path_1.default.resolve(__dirname, '../../../prompts', fileName);
    return promises_1.default.readFile(promptPath, 'utf8');
}
/** OpenAI-compatible chat API (OpenAI, Groq, Ollama /v1). */
class OpenAICompatibleLLMProvider {
    constructor(apiKey, baseUrl, model, providerLabel, useJsonSchema) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.providerLabel = providerLabel;
        this.useJsonSchema = useJsonSchema;
    }
    async createStructuredResponse(args) {
        const body = {
            model: this.model,
            messages: args.messages
        };
        if (this.useJsonSchema) {
            body.response_format = {
                type: 'json_schema',
                json_schema: {
                    name: args.schema.name,
                    strict: true,
                    schema: args.schema.schema
                }
            };
        }
        else {
            body.response_format = { type: 'json_object' };
            const systemIdx = args.messages.findIndex((m) => m.role === 'system');
            const schemaHint = `Respond with valid JSON matching this schema: ${JSON.stringify(args.schema.schema)}`;
            if (systemIdx >= 0) {
                body.messages = args.messages.map((m, i) => i === systemIdx ? { ...m, content: `${m.content}\n\n${schemaHint}` } : m);
            }
            else {
                body.messages = [{ role: 'system', content: schemaHint }, ...args.messages];
            }
        }
        const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`LLM request failed (${this.providerLabel}): ${response.status} ${errorBody}`);
        }
        const payload = (await response.json());
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error(`LLM response did not contain content (${this.providerLabel})`);
        }
        return {
            provider: `${this.providerLabel}:${this.model}`,
            content,
            usage: { totalTokens: payload.usage?.total_tokens }
        };
    }
}
exports.OpenAICompatibleLLMProvider = OpenAICompatibleLLMProvider;
class GeminiLLMProvider {
    constructor(apiKey, model = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash') {
        this.apiKey = apiKey;
        this.model = model;
    }
    async createStructuredResponse(args) {
        const system = args.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
        const user = args.messages.filter((m) => m.role !== 'system').map((m) => m.content).join('\n\n');
        const prompt = [
            system,
            `Respond with JSON only matching this schema: ${JSON.stringify(args.schema.schema)}`,
            user
        ]
            .filter(Boolean)
            .join('\n\n');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`LLM request failed (gemini): ${response.status} ${errorBody}`);
        }
        const payload = (await response.json());
        const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('Gemini response did not contain content');
        }
        return { provider: `gemini:${this.model}`, content };
    }
}
exports.GeminiLLMProvider = GeminiLLMProvider;
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
        return { provider: 'local-fallback', content: JSON.stringify(answer) };
    }
}
exports.LocalLLMProvider = LocalLLMProvider;
function resolveLLMProviderKind() {
    const explicit = process.env.LLM_PROVIDER?.toLowerCase();
    if (explicit === 'openai' || explicit === 'groq' || explicit === 'gemini' || explicit === 'ollama' || explicit === 'local') {
        return explicit;
    }
    if (process.env.GROQ_API_KEY)
        return 'groq';
    if (process.env.GEMINI_API_KEY)
        return 'gemini';
    if (process.env.OLLAMA_BASE_URL)
        return 'ollama';
    if (process.env.OPENAI_API_KEY)
        return 'openai';
    return 'local';
}
function createLLMProvider(kind = resolveLLMProviderKind()) {
    switch (kind) {
        case 'groq': {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey)
                throw new Error('GROQ_API_KEY is required when LLM_PROVIDER=groq');
            return new OpenAICompatibleLLMProvider(apiKey, 'https://api.groq.com/openai/v1', process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile', 'groq', false);
        }
        case 'gemini': {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey)
                throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');
            return new GeminiLLMProvider(apiKey);
        }
        case 'ollama': {
            const base = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1';
            return new OpenAICompatibleLLMProvider(process.env.OLLAMA_API_KEY ?? 'ollama', base, process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2', 'ollama', false);
        }
        case 'openai': {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
            return new OpenAICompatibleLLMProvider(apiKey, 'https://api.openai.com/v1', process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini', 'openai', true);
        }
        case 'local':
        default:
            return new LocalLLMProvider();
    }
}
/** @deprecated use createLLMProvider */
class OpenAILLMProvider extends OpenAICompatibleLLMProvider {
    constructor(apiKey, model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini') {
        super(apiKey, 'https://api.openai.com/v1', model, 'openai', true);
    }
}
exports.OpenAILLMProvider = OpenAILLMProvider;
function getDefaultLLMProvider() {
    return createLLMProvider();
}
