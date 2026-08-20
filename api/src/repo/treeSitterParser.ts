/* eslint-disable @typescript-eslint/no-require-imports */
import Parser = require('tree-sitter');
import TS = require('tree-sitter-typescript');
import JS = require('tree-sitter-javascript');
import Python = require('tree-sitter-python');
import Go = require('tree-sitter-go');
import path from 'node:path';

type TreeSitterSyntaxNode = {
  type: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number };
  endPosition: { row: number };
  namedChildren: TreeSitterSyntaxNode[];
  childForFieldName(fieldName: string): TreeSitterSyntaxNode | null;
};

type TreeSitterLanguageParam = Parameters<
  InstanceType<typeof Parser>['setLanguage']
>[0];

export type ParsedSymbolType = 'function' | 'class' | 'interface' | 'type';

export type ParsedSymbol = {
  name: string;
  type: ParsedSymbolType;
  startLine: number; // 1-based
  endLine: number; // 1-based
};

export type ParsedImport = {
  module: string;
  specifiers: string[];
};

export type ParsedExport = {
  name: string;
};

export type ParsedFile = {
  symbols: ParsedSymbol[];
  imports: ParsedImport[];
  exports: ParsedExport[];
};

function nodeText(code: string, node: TreeSitterSyntaxNode): string {
  return code.slice(node.startIndex, node.endIndex);
}

function toLineRange(node: TreeSitterSyntaxNode): { startLine: number; endLine: number } {
  return {
    startLine: node.startPosition.row + 1,
    // endPosition is exclusive; for “human friendly” ranges we keep it as the last line touched.
    endLine: Math.max(node.endPosition.row + 1, node.startPosition.row + 1)
  };
}

function symbolFromDeclarationNode(
  code: string,
  node: TreeSitterSyntaxNode
): ParsedSymbol | null {
  const nameNode = node.childForFieldName('name');
  const name =
    nameNode && nameNode.type === 'identifier'
      ? nodeText(code, nameNode)
      : nameNode
        ? nodeText(code, nameNode)
        : null;

  if (!name || !name.trim()) return null;

  let type: ParsedSymbolType | null = null;
  switch (node.type) {
    case 'function_declaration':
      type = 'function';
      break;
    case 'class_declaration':
      type = 'class';
      break;
    case 'interface_declaration':
      type = 'interface';
      break;
    case 'type_alias_declaration':
      type = 'type';
      break;
  }

  if (!type) return null;

  const { startLine, endLine } = toLineRange(node);
  return { name, type, startLine, endLine };
}

function extractImportsFromImportStatement(
  code: string,
  node: TreeSitterSyntaxNode
): ParsedImport {
  const text = nodeText(code, node);

  // module specifier: import ... from 'module'
  const modMatch = text.match(/from\s+['"]([^'"]+)['"]/);
  const module = modMatch?.[1] ?? '';

  // side-effect import: import 'module'
  const hasFromClause = Boolean(modMatch);
  if (!hasFromClause) {
    return { module, specifiers: [] };
  }

  const specifiers: string[] = [];

  // named imports: import { A, B as C } from 'mod'
  const namedMatch = text.match(/\{([^}]+)\}/);
  if (namedMatch) {
    const inside = namedMatch[1];
    for (const part of inside.split(',')) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const [left] = cleaned.split(/\s+as\s+/i);
      specifiers.push(left.trim());
    }
  }

  // default import: import React from 'mod'
  const defaultMatch = text.match(/^import\s+([A-Za-z_$][\w$]*)\s*(,|\s+from)/);
  if (defaultMatch) {
    const defaultName = defaultMatch[1];
    if (defaultName && !specifiers.includes(defaultName)) {
      specifiers.unshift(defaultName);
    }
  }

  // namespace import: import * as Utils from 'mod'
  const nsMatch = text.match(/^import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from/);
  if (nsMatch) {
    const nsName = nsMatch[1];
    if (nsName && !specifiers.includes(nsName)) {
      specifiers.unshift(nsName);
    }
  }

  return { module, specifiers };
}

function extractExportsFromExportStatement(
  code: string,
  node: TreeSitterSyntaxNode
): ParsedExport[] {
  const text = nodeText(code, node);
  const exports: ParsedExport[] = [];

  const functionMatch = text.match(/export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)/);
  if (functionMatch?.[2]) exports.push({ name: functionMatch[2] });

  const classMatch = text.match(/export\s+class\s+([A-Za-z_$][\w$]*)/);
  if (classMatch?.[1]) exports.push({ name: classMatch[1] });

  const interfaceMatch = text.match(/export\s+interface\s+([A-Za-z_$][\w$]*)/);
  if (interfaceMatch?.[1]) exports.push({ name: interfaceMatch[1] });

  const typeMatch = text.match(/export\s+type\s+([A-Za-z_$][\w$]*)/);
  if (typeMatch?.[1]) exports.push({ name: typeMatch[1] });

  // export { A, B as C }
  const namedClause = text.match(/export\s*\{([^}]+)\}/);
  if (namedClause?.[1]) {
    for (const part of namedClause[1].split(',')) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const [left] = cleaned.split(/\s+as\s+/i);
      exports.push({ name: left.trim() });
    }
  }

  // export default ...
  if (/\bexport\s+default\b/.test(text) && exports.length === 0) {
    exports.push({ name: 'default' });
  }

  return exports;
}

function languageForFile(filePath: string): TreeSitterLanguageParam {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.py') return Python as unknown as TreeSitterLanguageParam;
  if (ext === '.go') return Go as unknown as TreeSitterLanguageParam;
  if (ext === '.tsx') {
    return ((TS as unknown as { tsx?: TreeSitterLanguageParam }).tsx ?? TS.typescript) as TreeSitterLanguageParam;
  }
  if (ext === '.jsx') {
    const jsxLang = (JS as unknown as { jsx?: TreeSitterLanguageParam }).jsx;
    const jsFallback = (JS as unknown as { javascript?: TreeSitterLanguageParam }).javascript;
    return (jsxLang ?? jsFallback ?? TS.typescript) as TreeSitterLanguageParam;
  }
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    const jsLang = (JS as unknown as { javascript?: TreeSitterLanguageParam }).javascript;
    return (jsLang ?? TS.typescript) as TreeSitterLanguageParam;
  }
  return TS.typescript;
}

export function createTreeSitterParser(filePath: string): Parser {
  const parser = new Parser();
  parser.setLanguage(languageForFile(filePath));
  return parser;
}

export function extractPythonImports(text: string): ParsedImport[] {
  const compact = text.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();
  const fromMatch = compact.match(/^from\s+(\.+[\w.]*)\s+import\s+(.+)$/)
    ?? compact.match(/^from\s+([\w.]+)\s+import\s+(.+)$/);
  if (fromMatch) {
    const moduleBase = fromMatch[1];
    const rest = fromMatch[2].replace(/[()]/g, '').trim();
    if (rest === '*') return [{ module: moduleBase, specifiers: ['*'] }];

    const specifiers: string[] = [];
    for (const part of rest.split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim();
      if (name) specifiers.push(name);
    }
    if (/^\.+$/.test(moduleBase)) {
      return specifiers.map((name) => ({ module: `${moduleBase}${name}`, specifiers: [name] }));
    }
    return [{ module: moduleBase, specifiers }];
  }

  const importMatch = compact.match(/^import\s+(.+)$/);
  if (!importMatch) return [];
  const imports: ParsedImport[] = [];
  for (const part of importMatch[1].split(',')) {
    const module = part.trim().split(/\s+as\s+/)[0]?.trim();
    if (module) imports.push({ module, specifiers: [] });
  }
  return imports;
}

export function extractGoImports(text: string): ParsedImport[] {
  return [...text.matchAll(/"([^"]+)"/g)].map((match) => ({
    module: match[1],
    specifiers: []
  }));
}

function pythonSymbolFromNode(code: string, node: TreeSitterSyntaxNode): ParsedSymbol | null {
  if (node.type === 'decorated_definition') {
    for (const child of node.namedChildren) {
      const nested = pythonSymbolFromNode(code, child);
      if (nested) return nested;
    }
    return null;
  }
  if (node.type !== 'function_definition' && node.type !== 'class_definition') return null;
  const nameNode = node.childForFieldName('name');
  const name = nameNode ? nodeText(code, nameNode) : '';
  if (!name) return null;
  const { startLine, endLine } = toLineRange(node);
  return {
    name,
    type: node.type === 'class_definition' ? 'class' : 'function',
    startLine,
    endLine
  };
}

function goSymbolFromNode(code: string, node: TreeSitterSyntaxNode): ParsedSymbol | null {
  if (node.type === 'function_declaration' || node.type === 'method_declaration') {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? nodeText(code, nameNode) : '';
    if (!name) return null;
    const { startLine, endLine } = toLineRange(node);
    return { name, type: 'function', startLine, endLine };
  }
  if (node.type === 'type_declaration') {
    for (const child of node.namedChildren) {
      const nested = goSymbolFromNode(code, child);
      if (nested) return nested;
    }
    return null;
  }
  if (node.type === 'type_spec') {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? nodeText(code, nameNode) : '';
    if (!name) return null;
    const { startLine, endLine } = toLineRange(node);
    return { name, type: 'type', startLine, endLine };
  }
  return null;
}

export function parseCodeToRecords(
  filePath: string,
  code: string
): ParsedFile {
  const ext = path.extname(filePath).toLowerCase();
  // Markdown is stored for Wiki; tree-sitter has nothing useful to extract.
  if (ext === '.md' || ext === '.mdx') {
    return { symbols: [], imports: [], exports: [] };
  }

  const parser = createTreeSitterParser(filePath);
  const tree = parser.parse(code);

  const root = tree.rootNode;
  const symbols: ParsedSymbol[] = [];
  const imports: ParsedImport[] = [];
  const exportsList: ParsedExport[] = [];

  const visitTopLevel = (node: TreeSitterSyntaxNode) => {
    if (ext === '.py') {
      if (node.type === 'import_statement' || node.type === 'import_from_statement') {
        imports.push(...extractPythonImports(nodeText(code, node)));
        return;
      }
      const pySym = pythonSymbolFromNode(code, node);
      if (pySym) {
        symbols.push(pySym);
        exportsList.push({ name: pySym.name });
      }
      return;
    }

    if (ext === '.go') {
      if (node.type === 'import_declaration') {
        imports.push(...extractGoImports(nodeText(code, node)));
        return;
      }
      const goSym = goSymbolFromNode(code, node);
      if (goSym) {
        symbols.push(goSym);
        exportsList.push({ name: goSym.name });
      }
      return;
    }

    switch (node.type) {
      case 'import_statement':
        imports.push(extractImportsFromImportStatement(code, node));
        return;
      case 'export_statement':
        exportsList.push(...extractExportsFromExportStatement(code, node));

        // Also treat exported declarations as symbols when they are declared here.
        for (const child of node.namedChildren) {
          const sym = symbolFromDeclarationNode(code, child);
          if (sym) symbols.push(sym);
        }
        return;
      case 'function_declaration':
      case 'class_declaration':
      case 'interface_declaration':
      case 'type_alias_declaration': {
        const sym = symbolFromDeclarationNode(code, node);
        if (sym) symbols.push(sym);
        return;
      }
    }
  };

  for (const child of root.namedChildren) {
    visitTopLevel(child);
  }

  // De-dupe exports/symbols by (name,type/just name)
  const uniqSymbols: ParsedSymbol[] = [];
  const seenSymbols = new Set<string>();
  for (const s of symbols) {
    const key = `${s.type}:${s.name}`;
    if (seenSymbols.has(key)) continue;
    seenSymbols.add(key);
    uniqSymbols.push(s);
  }

  const uniqExports: ParsedExport[] = [];
  const seenExports = new Set<string>();
  for (const e of exportsList) {
    if (seenExports.has(e.name)) continue;
    seenExports.add(e.name);
    uniqExports.push(e);
  }

  return { symbols: uniqSymbols, imports, exports: uniqExports };
}

