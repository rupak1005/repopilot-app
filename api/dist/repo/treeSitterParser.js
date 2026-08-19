"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTreeSitterParser = createTreeSitterParser;
exports.parseCodeToRecords = parseCodeToRecords;
/* eslint-disable @typescript-eslint/no-require-imports */
const Parser = require("tree-sitter");
const TS = require("tree-sitter-typescript");
const JS = require("tree-sitter-javascript");
const node_path_1 = __importDefault(require("node:path"));
function nodeText(code, node) {
    return code.slice(node.startIndex, node.endIndex);
}
function toLineRange(node) {
    return {
        startLine: node.startPosition.row + 1,
        // endPosition is exclusive; for “human friendly” ranges we keep it as the last line touched.
        endLine: Math.max(node.endPosition.row + 1, node.startPosition.row + 1)
    };
}
function symbolFromDeclarationNode(code, node) {
    const nameNode = node.childForFieldName('name');
    const name = nameNode && nameNode.type === 'identifier'
        ? nodeText(code, nameNode)
        : nameNode
            ? nodeText(code, nameNode)
            : null;
    if (!name || !name.trim())
        return null;
    let type = null;
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
    if (!type)
        return null;
    const { startLine, endLine } = toLineRange(node);
    return { name, type, startLine, endLine };
}
function extractImportsFromImportStatement(code, node) {
    const text = nodeText(code, node);
    // module specifier: import ... from 'module'
    const modMatch = text.match(/from\s+['"]([^'"]+)['"]/);
    const module = modMatch?.[1] ?? '';
    // side-effect import: import 'module'
    const hasFromClause = Boolean(modMatch);
    if (!hasFromClause) {
        return { module, specifiers: [] };
    }
    const specifiers = [];
    // named imports: import { A, B as C } from 'mod'
    const namedMatch = text.match(/\{([^}]+)\}/);
    if (namedMatch) {
        const inside = namedMatch[1];
        for (const part of inside.split(',')) {
            const cleaned = part.trim();
            if (!cleaned)
                continue;
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
function extractExportsFromExportStatement(code, node) {
    const text = nodeText(code, node);
    const exports = [];
    const functionMatch = text.match(/export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)/);
    if (functionMatch?.[2])
        exports.push({ name: functionMatch[2] });
    const classMatch = text.match(/export\s+class\s+([A-Za-z_$][\w$]*)/);
    if (classMatch?.[1])
        exports.push({ name: classMatch[1] });
    const interfaceMatch = text.match(/export\s+interface\s+([A-Za-z_$][\w$]*)/);
    if (interfaceMatch?.[1])
        exports.push({ name: interfaceMatch[1] });
    const typeMatch = text.match(/export\s+type\s+([A-Za-z_$][\w$]*)/);
    if (typeMatch?.[1])
        exports.push({ name: typeMatch[1] });
    // export { A, B as C }
    const namedClause = text.match(/export\s*\{([^}]+)\}/);
    if (namedClause?.[1]) {
        for (const part of namedClause[1].split(',')) {
            const cleaned = part.trim();
            if (!cleaned)
                continue;
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
function createTreeSitterParser(filePath) {
    const ext = node_path_1.default.extname(filePath).toLowerCase();
    const parser = new Parser();
    // Tree-sitter-typescript exports a handful of language bindings (typescript + tsx).
    if (ext === '.ts' || ext === '.mts' || ext === '.cts') {
        parser.setLanguage(TS.typescript);
    }
    else if (ext === '.tsx') {
        const tsxLang = TS.tsx;
        parser.setLanguage(tsxLang ?? TS.typescript);
    }
    else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
        const jsLang = JS.javascript;
        parser.setLanguage(jsLang ?? TS.typescript);
    }
    else if (ext === '.jsx') {
        const jsxLang = JS.jsx;
        const jsFallback = JS.javascript;
        parser.setLanguage(jsxLang ?? jsFallback ?? TS.typescript);
    }
    else {
        // Default to TS grammar; parsing will still be best-effort.
        parser.setLanguage(TS.typescript);
    }
    return parser;
}
function parseCodeToRecords(filePath, code) {
    const parser = createTreeSitterParser(filePath);
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const symbols = [];
    const imports = [];
    const exportsList = [];
    const visitTopLevel = (node) => {
        switch (node.type) {
            case 'import_statement':
                imports.push(extractImportsFromImportStatement(code, node));
                return;
            case 'export_statement':
                exportsList.push(...extractExportsFromExportStatement(code, node));
                // Also treat exported declarations as symbols when they are declared here.
                for (const child of node.namedChildren) {
                    const sym = symbolFromDeclarationNode(code, child);
                    if (sym)
                        symbols.push(sym);
                }
                return;
            case 'function_declaration':
            case 'class_declaration':
            case 'interface_declaration':
            case 'type_alias_declaration': {
                const sym = symbolFromDeclarationNode(code, node);
                if (sym)
                    symbols.push(sym);
                return;
            }
        }
    };
    for (const child of root.namedChildren) {
        visitTopLevel(child);
    }
    // De-dupe exports/symbols by (name,type/just name)
    const uniqSymbols = [];
    const seenSymbols = new Set();
    for (const s of symbols) {
        const key = `${s.type}:${s.name}`;
        if (seenSymbols.has(key))
            continue;
        seenSymbols.add(key);
        uniqSymbols.push(s);
    }
    const uniqExports = [];
    const seenExports = new Set();
    for (const e of exportsList) {
        if (seenExports.has(e.name))
            continue;
        seenExports.add(e.name);
        uniqExports.push(e);
    }
    return { symbols: uniqSymbols, imports, exports: uniqExports };
}
