import { deriveRepositoryId } from '@repopilot/common';
import { execSync } from 'node:child_process';
import { askCodebaseQuestion } from './codebaseQa';
import { expandFromFile } from './contextGraph';
import { getModuleDependencyTraversal } from './dependencyGraphQueries';
import { searchHistory } from './engineeringIntelligence';
import { analyzeFileImpact } from './impactAnalysis';
import { resolveRepositoryRevision } from './repositoryRevisions';
import { searchRepository } from './searchIndex';

export type McpProvenanceSource = 'parser' | 'retrieval' | 'history' | 'inference';

export type McpProvenance = {
  repositoryId: string;
  revisionSha: string;
  source: McpProvenanceSource;
  generatedAt: string;
};

export type McpEnvelope<T> = {
  data: T;
  provenance: McpProvenance;
};

export function wrapMcpResult<T>(args: {
  repositoryId: string;
  revisionSha: string;
  source: McpProvenanceSource;
  data: T;
}): McpEnvelope<T> {
  return {
    data: args.data,
    provenance: {
      repositoryId: args.repositoryId,
      revisionSha: args.revisionSha,
      source: args.source,
      generatedAt: new Date().toISOString()
    }
  };
}

async function latestRevisionSha(repositoryId: string, revisionSha?: string): Promise<string> {
  const revision = await resolveRepositoryRevision({ repositoryId, revisionSha });
  if (!revision) {
    throw new Error('No indexed revision for repository');
  }
  return revision.revisionSha;
}

export async function mcpSearchCodebase(args: {
  repositoryId: string;
  query: string;
  topK?: number;
  revisionSha?: string;
}): Promise<McpEnvelope<{ results: Awaited<ReturnType<typeof searchRepository>>['results'] }>> {
  const revisionSha = await latestRevisionSha(args.repositoryId, args.revisionSha);
  const response = await searchRepository({
    repositoryId: args.repositoryId,
    query: args.query,
    topK: args.topK,
    revisionSha
  });
  return wrapMcpResult({
    repositoryId: args.repositoryId,
    revisionSha,
    source: 'retrieval',
    data: { results: response.results }
  });
}

export async function mcpFindImpact(args: {
  repositoryId: string;
  filePath: string;
  depth?: number;
  revisionSha?: string;
}): Promise<McpEnvelope<Awaited<ReturnType<typeof analyzeFileImpact>>>> {
  const revisionSha = await latestRevisionSha(args.repositoryId, args.revisionSha);
  const impact = await analyzeFileImpact({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
    depth: args.depth,
    revisionSha
  });
  if (!impact) {
    throw new Error('File not found in indexed repository');
  }
  return wrapMcpResult({
    repositoryId: args.repositoryId,
    revisionSha: impact.revisionSha,
    source: 'parser',
    data: impact
  });
}

export async function mcpTraceDependencies(args: {
  repositoryId: string;
  filePath: string;
  depth?: number;
  revisionSha?: string;
}): Promise<McpEnvelope<Awaited<ReturnType<typeof getModuleDependencyTraversal>>>> {
  const revisionSha = await latestRevisionSha(args.repositoryId, args.revisionSha);
  const traversal = await getModuleDependencyTraversal({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
    depthLimit: args.depth,
    revisionSha
  });
  if (!traversal) {
    throw new Error('File not found in indexed repository');
  }
  return wrapMcpResult({
    repositoryId: args.repositoryId,
    revisionSha,
    source: 'parser',
    data: traversal
  });
}

export async function mcpSearchHistory(args: {
  repositoryId: string;
  query: string;
  topK?: number;
}): Promise<McpEnvelope<{ results: Awaited<ReturnType<typeof searchHistory>> }>> {
  const revisionSha = await latestRevisionSha(args.repositoryId);
  const results = await searchHistory({
    repositoryId: args.repositoryId,
    query: args.query,
    topK: args.topK
  });
  return wrapMcpResult({
    repositoryId: args.repositoryId,
    revisionSha,
    source: 'history',
    data: { results }
  });
}

export async function mcpAskRepository(args: {
  repositoryId: string;
  question: string;
  revisionSha?: string;
}): Promise<McpEnvelope<Awaited<ReturnType<typeof askCodebaseQuestion>>>> {
  const revisionSha = await latestRevisionSha(args.repositoryId, args.revisionSha);
  const answer = await askCodebaseQuestion({
    repositoryId: args.repositoryId,
    query: args.question,
    revisionSha
  });
  return wrapMcpResult({
    repositoryId: args.repositoryId,
    revisionSha,
    source: 'inference',
    data: answer
  });
}

export async function mcpGetContextPack(args: {
  repositoryId: string;
  filePath?: string;
  question?: string;
  depth?: number;
  revisionSha?: string;
}): Promise<
  McpEnvelope<{
    revisionSha: string;
    impact?: Awaited<ReturnType<typeof analyzeFileImpact>>;
    dependencies?: Awaited<ReturnType<typeof expandFromFile>>;
    search?: Awaited<ReturnType<typeof searchRepository>>['results'];
  }>
> {
  if (!args.filePath?.trim() && !args.question?.trim()) {
    throw new Error('filePath or question is required');
  }

  const revisionSha = await latestRevisionSha(args.repositoryId, args.revisionSha);
  const pack: {
    revisionSha: string;
    impact?: Awaited<ReturnType<typeof analyzeFileImpact>>;
    dependencies?: Awaited<ReturnType<typeof expandFromFile>>;
    search?: Awaited<ReturnType<typeof searchRepository>>['results'];
  } = { revisionSha };

  if (args.filePath?.trim()) {
    const filePath = args.filePath.trim();
    pack.impact = await analyzeFileImpact({
      repositoryId: args.repositoryId,
      filePath,
      depth: args.depth,
      revisionSha
    });
    pack.dependencies = await expandFromFile({
      repositoryId: args.repositoryId,
      filePath,
      depth: args.depth,
      revisionSha
    });
  }

  if (args.question?.trim()) {
    const search = await searchRepository({
      repositoryId: args.repositoryId,
      query: args.question.trim(),
      topK: 5,
      revisionSha
    });
    pack.search = search.results;
  }

  return wrapMcpResult({
    repositoryId: args.repositoryId,
    revisionSha,
    source: 'parser',
    data: pack
  });
}

export function assertMcpAuth(providedKey?: string): void {
  const required = process.env.MCP_API_KEY?.trim();
  if (!required) return;
  if (providedKey !== required) {
    throw new Error('Unauthorized MCP call — invalid apiKey');
  }
}

const PLACEHOLDER_REPO_IDS = new Set(['YOUR_REPO_ID', 'your-repo-id', 'changeme']);

function repositoryIdFromEnvSlug(): string | null {
  const slug = process.env.MCP_REPO_SLUG?.trim();
  if (!slug || !slug.includes('/')) return null;
  return deriveRepositoryId(slug);
}

/** ponytail: dev fallback only — reads `git remote origin` when env is unset */
function repositoryIdFromGitOrigin(): string | null {
  try {
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const match = remote.match(/[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
    if (!match?.[1]) return null;
    return deriveRepositoryId(match[1]);
  } catch {
    return null;
  }
}

export function resolveMcpRepositoryId(): string | null {
  const direct = process.env.MCP_REPOSITORY_ID?.trim();
  if (direct && !PLACEHOLDER_REPO_IDS.has(direct)) {
    return direct;
  }
  return repositoryIdFromEnvSlug() ?? repositoryIdFromGitOrigin();
}

export function requireMcpRepositoryId(): string {
  const repositoryId = resolveMcpRepositoryId();
  if (!repositoryId) {
    throw new Error(
      'Configure MCP_REPOSITORY_ID (dashboard URL id) or MCP_REPO_SLUG (owner/repo) in api/.env or .cursor/mcp.json env'
    );
  }
  return repositoryId;
}
