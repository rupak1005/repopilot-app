/**
 * Static dynamic-import specifiers: `import('…')` / `import("…")` only.
 * Template literals and non-literal args are skipped (not statically resolvable).
 */
export function extractStaticDynamicImportSpecifiers(code: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const spec = match[1]?.trim();
    if (!spec || seen.has(spec)) continue;
    seen.add(spec);
    out.push(spec);
  }
  return out;
}
