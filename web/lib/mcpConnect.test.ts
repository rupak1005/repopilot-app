import { describe, expect, it } from 'vitest';
import { buildMcpCursorConfig, mcpContextPackSnippet, mcpToolExample } from './mcpConnect';

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

describe('mcpToolExample', () => {
  it('fills the current repository id into example calls', () => {
    expect(mcpToolExample('find_impact', { repositoryId: 'r1' })).toContain('r1');
    expect(mcpToolExample('ask_repository', { repositoryId: 'r1' })).toContain('How does login');
    expect(mcpToolExample('get_context_pack', { repositoryId: 'r1' })).toContain('filePath');
  });
});

describe('mcpContextPackSnippet', () => {
  it('builds a clipboard-ready get_context_pack call', () => {
    expect(
      mcpContextPackSnippet({ repositoryId: 'r1', filePath: 'api/src/x.ts' })
    ).toContain('api/src/x.ts');
  });
});
