import { describe, expect, it } from 'vitest';
import { buildMcpCursorConfig } from './mcpConnect';

describe('buildMcpCursorConfig', () => {
  it('embeds repository id and slug in MCP JSON', () => {
    const json = buildMcpCursorConfig({
      repositoryId: 'abc-123',
      repoSlug: 'acme/widget'
    });
    const parsed = JSON.parse(json) as {
      mcpServers: { repopilot: { command: string; env: Record<string, string> } };
    };
    expect(parsed.mcpServers.repopilot.command).toBe('yarn');
    expect(parsed.mcpServers.repopilot.env.MCP_REPOSITORY_ID).toBe('abc-123');
    expect(parsed.mcpServers.repopilot.env.MCP_REPO_SLUG).toBe('acme/widget');
  });
});
