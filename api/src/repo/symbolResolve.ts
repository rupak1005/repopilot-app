import { resolveModuleSpecifier } from './moduleResolve';
import type { PackageExportEntry } from './packageExports';
import type { PathAliasRule } from './tsconfigPaths';

export type ImportBindingKind = 'named' | 'default' | 'namespace';

export type ImportBinding = {
  module: string;
  kind: ImportBindingKind;
  importedName: string;
};

export type ResolveSymbolFile = {
  path: string;
  content: string;
  symbols: Array<{ id: string; name: string }>;
  exports: Array<{ name: string }>;
};

export type JsReExport = {
  /** Public name importers see (`bar` in `export { foo as bar }`). */
  exportedName: string;
  /** Name in the source module (`foo`). */
  localName: string;
  fromModule: string;
};

const MAX_REEXPORT_HOPS = 4;

/**
 * Parse JS/TS re-export statements from source text.
 * Covers `export { a, b as c } from '…'` and `export * from '…'`.
 */
export function parseJsReExports(code: string): JsReExport[] {
  const out: JsReExport[] = [];

  for (const match of code.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const clause = match[1] ?? '';
    const fromModule = match[2] ?? '';
    if (!fromModule) continue;
    for (const part of clause.split(',')) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const [left, right] = cleaned.split(/\s+as\s+/i);
      const localName = (left ?? '').trim();
      const exportedName = (right ?? left ?? '').trim();
      if (!localName || !exportedName) continue;
      out.push({ exportedName, localName, fromModule });
    }
  }

  for (const match of code.matchAll(/export\s*\*\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?from\s*['"]([^'"]+)['"]/g)) {
    const fromModule = match[1] ?? '';
    if (!fromModule) continue;
    out.push({ exportedName: '*', localName: '*', fromModule });
  }

  return out;
}

function findLocalSymbolId(file: ResolveSymbolFile, name: string): string | null {
  return file.symbols.find((symbol) => symbol.name === name)?.id ?? null;
}

/**
 * Resolve an imported binding to a symbol id, following barrel / re-export hops.
 * Does not invent edges: returns null when the chain cannot be grounded in indexed files.
 */
export function resolveImportedSymbolId(args: {
  targetFile: ResolveSymbolFile;
  binding: ImportBinding;
  propertyName?: string;
  filesByPath: Map<string, ResolveSymbolFile>;
  knownFiles: Set<string>;
  pathAliases?: PathAliasRule[];
  packageExports?: PackageExportEntry[];
  depth?: number;
}): string | null {
  const depth = args.depth ?? 0;
  if (depth > MAX_REEXPORT_HOPS) return null;

  const { targetFile, binding, propertyName } = args;

  if (binding.kind === 'namespace') {
    if (!propertyName) return null;
    const direct = findLocalSymbolId(targetFile, propertyName);
    if (direct) return direct;
    return followReExport({
      ...args,
      exportedName: propertyName,
      depth: depth + 1
    });
  }

  if (binding.kind === 'default') {
    const defaultExport = targetFile.exports.find((entry) => entry.name === 'default');
    if (!defaultExport) {
      return followReExport({
        ...args,
        exportedName: 'default',
        depth: depth + 1
      });
    }
    if (targetFile.symbols.length === 1) {
      return targetFile.symbols[0]?.id ?? null;
    }
    return null;
  }

  const name = binding.importedName;
  const direct = findLocalSymbolId(targetFile, name);
  if (direct) return direct;

  const exportExists = targetFile.exports.some((entry) => entry.name === name);
  if (exportExists) {
    const again = findLocalSymbolId(targetFile, name);
    if (again) return again;
  }

  return followReExport({
    ...args,
    exportedName: name,
    depth: depth + 1
  });
}

function followReExport(args: {
  targetFile: ResolveSymbolFile;
  binding: ImportBinding;
  propertyName?: string;
  filesByPath: Map<string, ResolveSymbolFile>;
  knownFiles: Set<string>;
  pathAliases?: PathAliasRule[];
  packageExports?: PackageExportEntry[];
  exportedName: string;
  depth: number;
}): string | null {
  const reExports = parseJsReExports(args.targetFile.content);
  const star = reExports.filter((entry) => entry.exportedName === '*');
  const named = reExports.find((entry) => entry.exportedName === args.exportedName);

  const candidates: JsReExport[] = named ? [named, ...star] : star;
  for (const entry of candidates) {
    const resolvedPath = resolveModuleSpecifier(
      args.targetFile.path,
      entry.fromModule,
      args.knownFiles,
      args.pathAliases ?? [],
      args.packageExports ?? []
    );
    if (!resolvedPath) continue;
    const nextFile = args.filesByPath.get(resolvedPath);
    if (!nextFile) continue;

    const nextBinding: ImportBinding =
      entry.exportedName === '*'
        ? { module: entry.fromModule, kind: 'named', importedName: args.exportedName }
        : {
            module: entry.fromModule,
            kind: 'named',
            importedName: entry.localName === '*' ? args.exportedName : entry.localName
          };

    const hit = resolveImportedSymbolId({
      targetFile: nextFile,
      binding: nextBinding,
      filesByPath: args.filesByPath,
      knownFiles: args.knownFiles,
      pathAliases: args.pathAliases,
      packageExports: args.packageExports,
      depth: args.depth
    });
    if (hit) return hit;
  }

  return null;
}
