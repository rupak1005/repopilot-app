import dotenv from 'dotenv';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  assertMcpAuth,
  mcpAskRepository,
  mcpFindImpact,
  mcpGetContextPack,
  mcpSearchCodebase,
  mcpSearchHistory,
  mcpTraceDependencies,
  requireMcpRepositoryId
} from '../services/mcpTools';

const moduleDir = __dirname;
dotenv.config({ path: path.resolve(moduleDir, '../../.env') });

function toolJson(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }]
  };
}

function toolError(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true as const
  };
}

async function main() {
  const repositoryId = requireMcpRepositoryId();
  const server = new McpServer({
    name: 'repopilot',
    version: '0.1.0'
  });

  const authField = {
    apiKey: z.string().optional().describe('Required when MCP_API_KEY is set on the server')
  };

  server.registerTool(
    'search_codebase',
    {
      description: 'Search indexed repository code with lexical + semantic retrieval.',
      inputSchema: {
        ...authField,
        query: z.string().min(1),
        topK: z.number().int().min(1).max(20).optional(),
        revisionSha: z.string().optional()
      }
    },
    async ({ apiKey, query, topK, revisionSha }) => {
      try {
        assertMcpAuth(apiKey);
        return toolJson(
          await mcpSearchCodebase({ repositoryId, query, topK, revisionSha })
        );
      } catch (err) {
        return toolError(err instanceof Error ? err.message : 'search_codebase failed');
      }
    }
  );

  server.registerTool(
    'find_impact',
    {
      description: 'Compute blast radius, tests, co-change history and risk for a module path.',
      inputSchema: {
        ...authField,
        filePath: z.string().min(1),
        depth: z.number().int().min(1).max(5).optional(),
        revisionSha: z.string().optional()
      }
    },
    async ({ apiKey, filePath, depth, revisionSha }) => {
      try {
        assertMcpAuth(apiKey);
        return toolJson(await mcpFindImpact({ repositoryId, filePath, depth, revisionSha }));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : 'find_impact failed');
      }
    }
  );

  server.registerTool(
    'trace_dependencies',
    {
      description: 'Return direct and transitive module dependents for a file path.',
      inputSchema: {
        ...authField,
        filePath: z.string().min(1),
        depth: z.number().int().min(1).max(5).optional(),
        revisionSha: z.string().optional()
      }
    },
    async ({ apiKey, filePath, depth, revisionSha }) => {
      try {
        assertMcpAuth(apiKey);
        return toolJson(
          await mcpTraceDependencies({ repositoryId, filePath, depth, revisionSha })
        );
      } catch (err) {
        return toolError(err instanceof Error ? err.message : 'trace_dependencies failed');
      }
    }
  );

  server.registerTool(
    'search_history',
    {
      description: 'Search commit and pull-request history for a query string.',
      inputSchema: {
        ...authField,
        query: z.string().min(1),
        topK: z.number().int().min(1).max(20).optional()
      }
    },
    async ({ apiKey, query, topK }) => {
      try {
        assertMcpAuth(apiKey);
        return toolJson(await mcpSearchHistory({ repositoryId, query, topK }));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : 'search_history failed');
      }
    }
  );

  server.registerTool(
    'ask_repository',
    {
      description:
        'Ask a natural-language question over repository evidence. Results are model inference — check citations.',
      inputSchema: {
        ...authField,
        question: z.string().min(1),
        revisionSha: z.string().optional()
      }
    },
    async ({ apiKey, question, revisionSha }) => {
      try {
        assertMcpAuth(apiKey);
        return toolJson(await mcpAskRepository({ repositoryId, question, revisionSha }));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : 'ask_repository failed');
      }
    }
  );

  server.registerTool(
    'get_context_pack',
    {
      description:
        'Export a structured context pack (impact, graph neighbors, search hits) for agent handoff.',
      inputSchema: {
        ...authField,
        filePath: z.string().optional(),
        question: z.string().optional(),
        depth: z.number().int().min(1).max(5).optional(),
        revisionSha: z.string().optional()
      }
    },
    async ({ apiKey, filePath, question, depth, revisionSha }) => {
      try {
        assertMcpAuth(apiKey);
        return toolJson(
          await mcpGetContextPack({ repositoryId, filePath, question, depth, revisionSha })
        );
      } catch (err) {
        return toolError(err instanceof Error ? err.message : 'get_context_pack failed');
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`RepoPilot MCP server ready for repository ${repositoryId}`);
}

main().catch((error) => {
  console.error('RepoPilot MCP server failed:', error);
  process.exit(1);
});
