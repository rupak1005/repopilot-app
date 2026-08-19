/* eslint-disable @typescript-eslint/no-require-imports */
import Parser = require('tree-sitter');
import TS = require('tree-sitter-typescript');
import JS = require('tree-sitter-javascript');
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

export function createTreeSitterParser(
  filePath: string
): Parser {
  const ext = path.extname(filePath).toLowerCase();
  const parser = new Parser();

  // Tree-sitter-typescript exports a handful of language bindings (typescript + tsx).
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') {
    parser.setLanguage(TS.typescript);
  } else if (ext === '.tsx') {
    const tsxLang = (TS as unknown as {
      tsx?: TreeSitterLanguageParam;
    }).tsx;
    parser.setLanguage(tsxLang ?? TS.typescript);
  } else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    const jsLang = (JS as unknown as {
      javascript?: TreeSitterLanguageParam;
    }).javascript;
    parser.setLanguage(jsLang ?? TS.typescript);
  } else if (ext === '.jsx') {
    const jsxLang = (JS as unknown as {
      jsx?: TreeSitterLanguageParam;
    }).jsx;
    const jsFallback = (JS as unknown as {
      javascript?: TreeSitterLanguageParam;
    }).javascript;
    parser.setLanguage(jsxLang ?? jsFallback ?? TS.typescript);
  } else {
    // Default to TS grammar; parsing will still be best-effort.
    parser.setLanguage(TS.typescript);
  }

  return parser;
}

export function parseCodeToRecords(
  filePath: string,
  code: string
): ParsedFile {
  const parser = createTreeSitterParser(filePath);
  const tree = parser.parse(code);

  const root = tree.rootNode;
  const symbols: ParsedSymbol[] = [];
  const imports: ParsedImport[] = [];
  const exportsList: ParsedExport[] = [];

  const visitTopLevel = (node: TreeSitterSyntaxNode) => {
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

