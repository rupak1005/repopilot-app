import type { ParsedFile, ParsedSymbol } from './treeSitterParser';
import { getPrisma } from '../db/prisma';

export type PersistedCounts = {
  fileId: string;
  symbols: number;
  imports: number;
  exports: number;
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

export async function upsertFileAndReplaceParsedData(args: {
  repositoryId: string;
  path: string;
  content: string;
  parsed: ParsedFile;
}): Promise<PersistedCounts> {
  const prisma = getPrisma();
  const indexedAt = new Date();

  return prisma.$transaction(async (tx) => {
    // 1) Upsert file
    const file = await tx.file.upsert({
      where: {
        repositoryId_path: {
          repositoryId: args.repositoryId,
          path: args.path
        }
      },
      update: {
        content: args.content,
        indexedAt
      },
      create: {
        repositoryId: args.repositoryId,
        path: args.path,
        content: args.content,
        indexedAt
      }
    });

    // 2) Replace symbols + imports + exports for this file
    await tx.symbol.deleteMany({ where: { fileId: file.id } });
    await tx.fileImport.deleteMany({ where: { fileId: file.id } });
    await tx.fileExport.deleteMany({ where: { fileId: file.id } });

    const symbolsToInsert: Array<ParsedSymbol> = args.parsed.symbols;

    await Promise.all([
      tx.symbol.createMany({
        data: symbolsToInsert.map((s) => ({
          fileId: file.id,
          name: s.name,
          type: s.type,
          startLine: s.startLine,
          endLine: s.endLine
        }))
      }),
      tx.fileImport.createMany({
        data: args.parsed.imports.map((imp) => ({
          fileId: file.id,
          module: imp.module,
          specifiers: imp.specifiers
        }))
      }),
      tx.fileExport.createMany({
        data: args.parsed.exports.map((exp) => ({
          fileId: file.id,
          name: exp.name
        }))
      })
    ]);

    return {
      fileId: file.id,
      symbols: args.parsed.symbols.length,
      imports: args.parsed.imports.length,
      exports: args.parsed.exports.length
    };
  });
}

