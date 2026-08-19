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

export class OpenAILLMProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini'
  ) {}

  async createStructuredResponse(args: {
    messages: ChatMessage[];
    schema: JsonSchemaSpec;
  }): Promise<{
    provider: string;
    content: string;
    usage?: {
      totalTokens?: number;
    };
  }> {
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

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
      usage?: {
        total_tokens?: number;
      };
    };

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

export class LocalLLMProvider implements LLMProvider {
  async createStructuredResponse(args: {
    messages: ChatMessage[];
    schema: JsonSchemaSpec;
  }): Promise<{
    provider: string;
    content: string;
  }> {
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

    return {
      provider: 'local-fallback',
      content: JSON.stringify(answer)
    };
  }
}

export function getDefaultLLMProvider(): LLMProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return new OpenAILLMProvider(apiKey);
  }

  return new LocalLLMProvider();
}
