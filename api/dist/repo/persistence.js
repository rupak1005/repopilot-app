"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRepository = ensureRepository;
exports.ensureRepositoryRevision = ensureRepositoryRevision;
exports.clearRevisionData = clearRevisionData;
exports.insertFileParsedData = insertFileParsedData;
const prisma_1 = require("../db/prisma");
async function ensureRepository(args) {
    const prisma = (0, prisma_1.getPrisma)();
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
async function ensureRepositoryRevision(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      INSERT INTO "RepositoryRevision" ("repositoryId", "revisionSha", "indexedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT ("repositoryId", "revisionSha")
      DO UPDATE SET "indexedAt" = EXCLUDED."indexedAt"
      RETURNING "id", "revisionSha", "indexedAt"
    `, args.repositoryId, args.revisionSha));
    const revision = rows[0];
    if (!revision) {
        throw new Error(`Failed to ensure revision for repository ${args.repositoryId}`);
    }
    return revision;
}
async function clearRevisionData(args) {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
        DELETE FROM "ModuleDependency"
        WHERE "revisionId" = $1
      `, args.revisionId);
        await tx.$executeRawUnsafe(`
        DELETE FROM "File"
        WHERE "revisionId" = $1
      `, args.revisionId);
    });
}
async function insertFileParsedData(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const indexedAt = new Date();
    return prisma.$transaction(async (tx) => {
        const fileRows = (await tx.$queryRawUnsafe(`
        INSERT INTO "File" ("repositoryId", "revisionId", "path", "content", "indexedAt")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING "id"
      `, args.repositoryId, args.revisionId, args.path, args.content, indexedAt));
        const file = fileRows[0];
        if (!file) {
            throw new Error(`Failed to insert file row for ${args.path}`);
        }
        const symbolsToInsert = args.parsed.symbols;
        for (const symbol of symbolsToInsert) {
            await tx.$executeRawUnsafe(`
          INSERT INTO "Symbol" ("fileId", "name", "type", "startLine", "endLine")
          VALUES ($1, $2, $3, $4, $5)
        `, file.id, symbol.name, symbol.type, symbol.startLine, symbol.endLine);
        }
        for (const fileImport of args.parsed.imports) {
            await tx.$executeRawUnsafe(`
          INSERT INTO "FileImport" ("fileId", "module", "specifiers")
          VALUES ($1, $2, $3)
        `, file.id, fileImport.module, fileImport.specifiers);
        }
        for (const fileExport of args.parsed.exports) {
            await tx.$executeRawUnsafe(`
          INSERT INTO "FileExport" ("fileId", "name")
          VALUES ($1, $2)
        `, file.id, fileExport.name);
        }
        return {
            fileId: file.id,
            revisionId: args.revisionId,
            symbols: args.parsed.symbols.length,
            imports: args.parsed.imports.length,
            exports: args.parsed.exports.length
        };
    });
}
