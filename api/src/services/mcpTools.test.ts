import { describe, expect, it, vi, afterEach } from 'vitest';
import { deriveRepositoryId } from '@repopilot/common';
import { resolveMcpRepositoryId, wrapMcpResult } from './mcpTools';

describe('mcpTools', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('wrapMcpResult attaches provenance metadata', () => {
    const envelope = wrapMcpResult({
      repositoryId: 'demo/repo',
      revisionSha: 'abc123',
      source: 'parser',
      data: { ok: true }
    });
    expect(envelope.data).toEqual({ ok: true });
    expect(envelope.provenance.repositoryId).toBe('demo/repo');
    expect(envelope.provenance.source).toBe('parser');
  });

  it('resolveMcpRepositoryId accepts MCP_REPO_SLUG', () => {
    vi.stubEnv('MCP_REPOSITORY_ID', '');
    vi.stubEnv('MCP_REPO_SLUG', 'owner/Repo');
    expect(resolveMcpRepositoryId()).toBe(deriveRepositoryId('owner/repo'));
  });

  it('resolveMcpRepositoryId ignores placeholder MCP_REPOSITORY_ID', () => {
    vi.stubEnv('MCP_REPOSITORY_ID', 'YOUR_REPO_ID');
    vi.stubEnv('MCP_REPO_SLUG', 'acme/widget');
    expect(resolveMcpRepositoryId()).toBe(deriveRepositoryId('acme/widget'));
  });
});
