import { getPrisma } from '../db/prisma';
import { resolveRepositoryRevision } from './repositoryRevisions';

export type WikiPageKind = 'adr' | 'docs' | 'readme' | 'other';

export type WikiPage = {
  path: string;
  title: string;
  kind: WikiPageKind;
  excerpt: string;
};

export type WikiPageDetail = WikiPage & {
  content: string;
};

const MARKDOWN_EXT = /\.(md|mdx)$/i;

export function classifyWikiPath(filePath: string): WikiPageKind | null {
  if (!MARKDOWN_EXT.test(filePath)) return null;
  const lower = filePath.toLowerCase().replace(/\\/g, '/');
  const base = lower.split('/').pop() ?? lower;
  if (/(^|\/)(adr|adrs|architecture-decisions)(\/|$)/.test(lower) || /^adr[-_]?\d+/i.test(base)) {
    return 'adr';
  }
  if (/^readme(\.|$)/i.test(base)) return 'readme';
  if (/(^|\/)(docs|documentation|doc)\//.test(lower)) return 'docs';
  return 'other';
}

export function wikiTitleFromContent(filePath: string, content: string): string {
  const heading = content.match(/^#{1,3}\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim().replace(/\s+/g, ' ');
  const base = filePath.split('/').pop() ?? filePath;
  return base.replace(MARKDOWN_EXT, '').replace(/[-_]/g, ' ');
}

export function wikiExcerptFromContent(content: string, maxLen = 160): string {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('|')) {
      continue;
    }
    const plain = trimmed.replace(/[`*_\[\]()>]/g, '').trim();
    if (!plain) continue;
    return plain.length > maxLen ? `${plain.slice(0, maxLen - 1)}…` : plain;
  }
  return '';
}

function kindRank(kind: WikiPageKind): number {
  if (kind === 'adr') return 0;
  if (kind === 'docs') return 1;
  if (kind === 'readme') return 2;
  return 3;
}

export async function listRepositoryWikiPages(args: {
  repositoryId: string;
  revisionSha?: string;
  limit?: number;
}): Promise<{ revisionSha: string | null; pages: WikiPage[] }> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return { revisionSha: null, pages: [] };

  const prisma = getPrisma();
  const limit = Math.min(Math.max(args.limit ?? 80, 1), 200);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "path", "content"
      FROM "File"
      WHERE "revisionId" = $1
        AND (
          "path" ILIKE '%.md'
          OR "path" ILIKE '%.mdx'
        )
      ORDER BY "path" ASC
      LIMIT $2
    `,
    revision.id,
    limit
  )) as Array<{ path: string; content: string }>;

  const pages: WikiPage[] = [];
  for (const row of rows) {
    const kind = classifyWikiPath(row.path);
    if (!kind) continue;
    pages.push({
      path: row.path,
      title: wikiTitleFromContent(row.path, row.content),
      kind,
      excerpt: wikiExcerptFromContent(row.content)
    });
  }

  pages.sort((a, b) => {
    const diff = kindRank(a.kind) - kindRank(b.kind);
    if (diff !== 0) return diff;
    return a.path.localeCompare(b.path);
  });

  return { revisionSha: revision.revisionSha, pages };
}

export async function getRepositoryWikiPage(args: {
  repositoryId: string;
  path: string;
  revisionSha?: string;
}): Promise<{ revisionSha: string | null; page: WikiPageDetail | null }> {
  const filePath = decodeURIComponent(args.path.trim().replace(/\\/g, '/')).replace(/^\.\//, '');
  if (!filePath || !classifyWikiPath(filePath)) {
    return { revisionSha: null, page: null };
  }

  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return { revisionSha: null, page: null };

  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "path", "content"
      FROM "File"
      WHERE "revisionId" = $1
        AND (
          "path" = $2
          OR lower("path") = lower($2)
        )
      ORDER BY CASE WHEN "path" = $2 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    revision.id,
    filePath
  )) as Array<{ path: string; content: string }>;

  const row = rows[0];
  if (!row) return { revisionSha: revision.revisionSha, page: null };

  const kind = classifyWikiPath(row.path);
  if (!kind) return { revisionSha: revision.revisionSha, page: null };

  return {
    revisionSha: revision.revisionSha,
    page: {
      path: row.path,
      title: wikiTitleFromContent(row.path, row.content),
      kind,
      excerpt: wikiExcerptFromContent(row.content),
      content: row.content
    }
  };
}
