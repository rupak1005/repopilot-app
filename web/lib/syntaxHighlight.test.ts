import { describe, expect, it } from 'vitest';
import { languageFamily, tokenizeCode } from './syntaxHighlight';

describe('languageFamily', () => {
  it('maps common extensions', () => {
    expect(languageFamily('api/src/server.ts')).toBe('js');
    expect(languageFamily('App.tsx')).toBe('js');
    expect(languageFamily('src/data/product.js')).toBe('js');
    expect(languageFamily('main.py')).toBe('py');
    expect(languageFamily('cmd/api/main.go')).toBe('go');
    expect(languageFamily('README.md')).toBe('plain');
  });
});

describe('tokenizeCode', () => {
  it('colors keywords, strings, and function calls for TypeScript', () => {
    const tokens = tokenizeCode(
      'export async function syncRepository(path: Path) {\n  return "ok";\n}',
      'lib/sync.ts'
    );
    const byKind = (kind: string) => tokens.filter((t) => t.kind === kind).map((t) => t.text);
    expect(byKind('keyword')).toEqual(expect.arrayContaining(['export', 'async', 'function', 'return']));
    expect(byKind('function')).toContain('syncRepository');
    expect(byKind('string')).toContain('"ok"');
    expect(byKind('type')).toContain('Path');
  });

  it('keeps plain text for unknown languages', () => {
    expect(tokenizeCode('# Hello', 'README.md')).toEqual([{ kind: 'plain', text: '# Hello' }]);
  });

  it('highlights python comments and defs', () => {
    const tokens = tokenizeCode('def load():\n  # note\n  return None', 'app.py');
    expect(tokens.some((t) => t.kind === 'keyword' && t.text === 'def')).toBe(true);
    expect(tokens.some((t) => t.kind === 'comment' && t.text.includes('note'))).toBe(true);
    expect(tokens.some((t) => t.kind === 'function' && t.text === 'load')).toBe(true);
  });
});
