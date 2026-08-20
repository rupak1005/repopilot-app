import fs from 'node:fs/promises';
import path from 'node:path';

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

export async function loadPromptTemplate(fileName: string): Promise<string> {
  const promptPath = path.resolve(__dirname, '../../../prompts', fileName);
  return fs.readFile(promptPath, 'utf8');
}

/** OpenAI-compatible chat API (OpenAI, Groq, Ollama /v1). */
export class OpenAICompatibleLLMProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly providerLabel: string,
    private readonly useJsonSchema: boolean
  ) {}

  async createStructuredResponse(args: {
    messages: ChatMessage[];
    schema: JsonSchemaSpec;
  }): Promise<{
    provider: string;
    content: string;
    usage?: { totalTokens?: number };
  }> {
    const body: Record<string, unknown> = {
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
    } else {
      body.response_format = { type: 'json_object' };
      const systemIdx = args.messages.findIndex((m) => m.role === 'system');
      const schemaHint = `Respond with valid JSON matching this schema: ${JSON.stringify(args.schema.schema)}`;
      if (systemIdx >= 0) {
        body.messages = args.messages.map((m, i) =>
          i === systemIdx ? { ...m, content: `${m.content}\n\n${schemaHint}` } : m
        );
      } else {
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

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: { total_tokens?: number };
    };

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

export class GeminiLLMProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash'
  ) {}

  async createStructuredResponse(args: {
    messages: ChatMessage[];
    schema: JsonSchemaSpec;
  }): Promise<{ provider: string; content: string }> {
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

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Gemini response did not contain content');
    }

    return { provider: `gemini:${this.model}`, content };
  }
}

export class LocalLLMProvider implements LLMProvider {
  async createStructuredResponse(args: {
    messages: ChatMessage[];
    schema: JsonSchemaSpec;
  }): Promise<{ provider: string; content: string }> {
    const userMessage = args.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join('\n');

    const answer = {
      answer:
        'This is a locally generated grounded answer. Review the cited snippets for the best available match.',
      confidence: 'LOW',
      citations: [],
      notes: [userMessage.slice(0, 240)]
    };

    return { provider: 'local-fallback', content: JSON.stringify(answer) };
  }
}

export type LLMProviderKind = 'openai' | 'groq' | 'gemini' | 'ollama' | 'local';

export function resolveLLMProviderKind(): LLMProviderKind {
  const explicit = process.env.LLM_PROVIDER?.toLowerCase();
  if (explicit === 'openai' || explicit === 'groq' || explicit === 'gemini' || explicit === 'ollama' || explicit === 'local') {
    return explicit;
  }
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OLLAMA_BASE_URL) return 'ollama';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'local';
}

export function createLLMProvider(kind: LLMProviderKind = resolveLLMProviderKind()): LLMProvider {
  switch (kind) {
    case 'groq': {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('GROQ_API_KEY is required when LLM_PROVIDER=groq');
      return new OpenAICompatibleLLMProvider(
        apiKey,
        'https://api.groq.com/openai/v1',
        process.env.GROQ_CHAT_MODEL ?? 'openai/gpt-oss-120b',
        'groq',
        false
      );
    }
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');
      return new GeminiLLMProvider(apiKey);
    }
    case 'ollama': {
      const base = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1';
      return new OpenAICompatibleLLMProvider(
        process.env.OLLAMA_API_KEY ?? 'ollama',
        base,
        process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2',
        'ollama',
        false
      );
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
      return new OpenAICompatibleLLMProvider(
        apiKey,
        'https://api.openai.com/v1',
        process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
        'openai',
        true
      );
    }
    case 'local':
    default:
      return new LocalLLMProvider();
  }
}

/** @deprecated use createLLMProvider */
export class OpenAILLMProvider extends OpenAICompatibleLLMProvider {
  constructor(apiKey: string, model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini') {
    super(apiKey, 'https://api.openai.com/v1', model, 'openai', true);
  }
}

export function getDefaultLLMProvider(): LLMProvider {
  return createLLMProvider();
}
