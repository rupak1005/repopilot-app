import type { ParsedFile, ParsedSymbol } from './treeSitterParser';
import { getPrisma, prismaInteractiveTxOptions } from '../db/prisma';

export type PersistedCounts = {
  fileId: string;
  revisionId: string;
  symbols: number;
  imports: number;
  exports: number;
};

export type RepositoryRevisionRecord = {
  id: string;
  revisionSha: string;
  indexedAt: Date;
};

export async function ensureRepository(args: {
  repositoryId: string;
  name: string;
  owner: string;
}): Promise<void> {
  const prisma = getPrisma();

  await prisma.repository.upsert({
    where: { id: args.repositoryId },
    update: { name: args.name, owner: args.owner },
    create: {
      id: args.repositoryId,
      name: args.name,
      owner: args.owner
    }
  });
}

export async function ensureRepositoryRevision(args: {
  repositoryId: string;
  revisionSha: string;
}): Promise<RepositoryRevisionRecord> {
  const prisma = getPrisma();

  const rows = (await prisma.$queryRawUnsafe(
    `
      INSERT INTO "RepositoryRevision" ("repositoryId", "revisionSha", "indexedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT ("repositoryId", "revisionSha")
      DO UPDATE SET "indexedAt" = EXCLUDED."indexedAt"
      RETURNING "id", "revisionSha", "indexedAt"
    `,
    args.repositoryId,
    args.revisionSha
  )) as Array<RepositoryRevisionRecord>;

  const revision = rows[0];
  if (!revision) {
    throw new Error(`Failed to ensure revision for repository ${args.repositoryId}`);
  }

  return revision;
}

export async function clearRevisionData(args: { revisionId: string }): Promise<void> {
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `
        DELETE FROM "ModuleDependency"
        WHERE "revisionId" = $1
      `,
      args.revisionId
    );

    await tx.$executeRawUnsafe(
      `
        DELETE FROM "File"
        WHERE "revisionId" = $1
      `,
      args.revisionId
    );
  }, prismaInteractiveTxOptions);
}

export async function insertFileParsedData(args: {
  repositoryId: string;
  revisionId: string;
  path: string;
  content: string;
  parsed: ParsedFile;
}): Promise<PersistedCounts> {
  const prisma = getPrisma();
  const indexedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const fileRows = (await tx.$queryRawUnsafe(
      `
        INSERT INTO "File" ("repositoryId", "revisionId", "path", "content", "indexedAt")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING "id"
      `,
      args.repositoryId,
      args.revisionId,
      args.path,
      args.content,
      indexedAt
    )) as Array<{ id: string }>;
    const file = fileRows[0];
    if (!file) {
      throw new Error(`Failed to insert file row for ${args.path}`);
    }

    const symbolsToInsert: Array<ParsedSymbol> = args.parsed.symbols;

    for (const symbol of symbolsToInsert) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO "Symbol" ("fileId", "name", "type", "startLine", "endLine")
          VALUES ($1, $2, $3, $4, $5)
        `,
        file.id,
        symbol.name,
        symbol.type,
        symbol.startLine,
        symbol.endLine
      );
    }

    for (const fileImport of args.parsed.imports) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO "FileImport" ("fileId", "module", "specifiers")
          VALUES ($1, $2, $3)
        `,
        file.id,
        fileImport.module,
        fileImport.specifiers
      );
    }

    for (const fileExport of args.parsed.exports) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO "FileExport" ("fileId", "name")
          VALUES ($1, $2)
        `,
        file.id,
        fileExport.name
      );
    }

    return {
      fileId: file.id,
      revisionId: args.revisionId,
      symbols: args.parsed.symbols.length,
      imports: args.parsed.imports.length,
      exports: args.parsed.exports.length
    };
  }, prismaInteractiveTxOptions);
}

