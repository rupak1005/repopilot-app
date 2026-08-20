export type SyntaxTokenKind =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'type'
  | 'punct';

export type SyntaxToken = { kind: SyntaxTokenKind; text: string };

type LangFamily = 'js' | 'py' | 'go' | 'plain';

const JS_KEYWORDS = new Set([
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'of',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'with',
  'yield'
]);

const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield'
]);

const GO_KEYWORDS = new Set([
  'break',
  'case',
  'chan',
  'const',
  'continue',
  'default',
  'defer',
  'else',
  'fallthrough',
  'for',
  'func',
  'go',
  'goto',
  'if',
  'import',
  'interface',
  'map',
  'package',
  'range',
  'return',
  'select',
  'struct',
  'switch',
  'type',
  'var',
  'true',
  'false',
  'nil',
  'iota'
]);

/** Map a file path or fence lang to a highlighter family. */
export function languageFamily(filePathOrLang?: string | null): LangFamily {
  if (!filePathOrLang) return 'plain';
  const base = filePathOrLang.includes('/')
    ? filePathOrLang.slice(filePathOrLang.lastIndexOf('/') + 1)
    : filePathOrLang;
  const ext = (base.includes('.') ? base.slice(base.lastIndexOf('.') + 1) : base).toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts', 'javascript', 'typescript'].includes(ext)) {
    return 'js';
  }
  if (['py', 'python'].includes(ext)) return 'py';
  if (['go', 'golang'].includes(ext)) return 'go';
  return 'plain';
}

function keywordsFor(family: LangFamily): Set<string> {
  if (family === 'js') return JS_KEYWORDS;
  if (family === 'py') return PY_KEYWORDS;
  if (family === 'go') return GO_KEYWORDS;
  return new Set();
}

function isTypeName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/.test(name) && name !== 'True' && name !== 'False' && name !== 'None';
}

/**
 * Lightweight IDE-ish tokenizer for search / wiki snippets.
 * Not a full parser — good enough for short highlighted previews.
 */
export function tokenizeCode(code: string, filePathOrLang?: string | null): SyntaxToken[] {
  const family = languageFamily(filePathOrLang);
  if (family === 'plain' || !code) {
    return code ? [{ kind: 'plain', text: code }] : [];
  }

  const keywords = keywordsFor(family);
  const tokens: SyntaxToken[] = [];
  // Strings, comments, numbers, idents, whitespace, other punct/operators.
  const re =
    family === 'py'
      ? /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)|(\s+)|([^\s])/g
      : /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\s])/g;

  let match: RegExpExecArray | null;
  const parts: Array<{ text: string; slot: number }> = [];
  while ((match = re.exec(code)) !== null) {
    const slot = match.findIndex((v, i) => i > 0 && v !== undefined);
    parts.push({ text: match[0], slot });
  }

  for (let i = 0; i < parts.length; i += 1) {
    const { text, slot } = parts[i]!;
    if (slot === 1) {
      tokens.push({ kind: 'string', text });
      continue;
    }
    if (slot === 2) {
      tokens.push({ kind: 'comment', text });
      continue;
    }
    if (slot === 3) {
      tokens.push({ kind: 'number', text });
      continue;
    }
    if (slot === 4) {
      if (keywords.has(text)) {
        tokens.push({ kind: 'keyword', text });
        continue;
      }
      let j = i + 1;
      while (j < parts.length && parts[j]!.slot === 5) j += 1;
      const next = parts[j]?.text;
      if (next === '(') {
        tokens.push({ kind: 'function', text });
      } else if (isTypeName(text)) {
        tokens.push({ kind: 'type', text });
      } else {
        tokens.push({ kind: 'plain', text });
      }
      continue;
    }
    if (slot === 5) {
      tokens.push({ kind: 'plain', text });
      continue;
    }
    tokens.push({ kind: 'punct', text });
  }

  return tokens;
}
