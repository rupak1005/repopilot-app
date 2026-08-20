import { getPrisma } from '../db/prisma';
import { resolveRepositoryRevision } from './repositoryRevisions';
import {
  CODEOWNERS_CANDIDATE_PATHS,
  ownersForPath,
  parseCodeOwners,
  type CodeOwnerRule
} from './codeOwners';

export type OwnershipSummary = {
  revisionSha: string | null;
  sourcePath: string | null;
  rules: Array<{ pattern: string; owners: string[]; line: number }>;
  /** Populated when `path` was requested. */
  path: string | null;
  owners: string[];
};

async function loadCodeOwnersFile(
  revisionId: string
): Promise<{ path: string; content: string } | null> {
  const prisma = getPrisma();
  for (const candidate of CODEOWNERS_CANDIDATE_PATHS) {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT "path", "content"
        FROM "File"
        WHERE "revisionId" = $1
          AND "path" = $2
        LIMIT 1
      `,
      revisionId,
      candidate
    )) as Array<{ path: string; content: string }>;
    if (rows[0]) return rows[0];
  }
  return null;
}

export async function getRepositoryOwnership(args: {
  repositoryId: string;
  revisionSha?: string;
  path?: string;
}): Promise<OwnershipSummary> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) {
    return { revisionSha: null, sourcePath: null, rules: [], path: null, owners: [] };
  }

  const file = await loadCodeOwnersFile(revision.id);
  if (!file) {
    return {
      revisionSha: revision.revisionSha,
      sourcePath: null,
      rules: [],
      path: args.path?.trim() || null,
      owners: []
    };
  }

  const parsed: CodeOwnerRule[] = parseCodeOwners(file.content);
  const path = args.path?.trim() ? args.path.trim().replace(/\\/g, '/') : null;
  return {
    revisionSha: revision.revisionSha,
    sourcePath: file.path,
    rules: parsed.map((rule) => ({
      pattern: rule.pattern,
      owners: rule.owners,
      line: rule.line
    })),
    path,
    owners: path ? ownersForPath(parsed, path) : []
  };
}
