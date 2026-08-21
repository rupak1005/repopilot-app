/**
 * Static dynamic-import specifiers: `import('…')` / `import("…")` only.
 * Template literals and non-literal args are skipped (not statically resolvable).
 */
export type StaticDynamicImport = {
  module: string;
  /** 1-based line of the `import(` call. */
  sourceLine: number;
};

export function extractStaticDynamicImports(code: string): StaticDynamicImport[] {
  const out: StaticDynamicImport[] = [];
  const seen = new Set<string>();
  for (const match of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const spec = match[1]?.trim();
    if (!spec || seen.has(spec)) continue;
    seen.add(spec);
    const index = match.index ?? 0;
    const sourceLine = code.slice(0, index).split('\n').length;
    out.push({ module: spec, sourceLine });
  }
  return out;
}

/** @deprecated Prefer extractStaticDynamicImports — kept for call sites that only need specs. */
export function extractStaticDynamicImportSpecifiers(code: string): string[] {
  return extractStaticDynamicImports(code).map((entry) => entry.module);
}
