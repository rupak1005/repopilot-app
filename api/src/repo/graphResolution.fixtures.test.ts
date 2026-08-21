import { describe, expect, it } from 'vitest';
import { resolveJsModule } from './moduleResolve';
import { parseJsReExports, resolveImportedSymbolId } from './symbolResolve';
import { parseCodeToRecords } from './treeSitterParser';
import { parseTsconfigPathAliases } from './tsconfigPaths';

/**
 * Phase 1.4 fixture suite — Gate A graph trust.
 * Measures resolve precision on alias / barrel / re-export shapes without DB.
 */
describe('graph resolution fixtures (Phase 1.4)', () => {
  it('resolves tsconfig path aliases and leaves unknown specs unresolved', () => {
    const aliases = parseTsconfigPathAliases(
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@lib/*': ['packages/lib/src/*'] }
        }
      }),
      'tsconfig.json'
    );
    const known = new Set(['packages/lib/src/money.ts', 'apps/web/src/app.ts']);
    expect(resolveJsModule('apps/web/src/app.ts', '@lib/money', known, aliases)).toBe(
      'packages/lib/src/money.ts'
    );
    expect(resolveJsModule('apps/web/src/app.ts', '@missing/x', known, aliases)).toBeNull();
  });

  it('parses named and star re-exports', () => {
    const code = `
      export { pay as processPayment } from './payment';
      export * from './ledger';
    `;
    expect(parseJsReExports(code)).toEqual(
      expect.arrayContaining([
        { exportedName: 'processPayment', localName: 'pay', fromModule: './payment' },
        { exportedName: '*', localName: '*', fromModule: './ledger' }
      ])
    );
  });

  it('records public export names for export-as and from-clauses', () => {
    const parsed = parseCodeToRecords(
      'src/index.ts',
      `
        export { pay as processPayment } from './payment';
        export * from './ledger';
        export function localHelper() {}
      `
    );
    expect(parsed.exports.map((e) => e.name)).toEqual(
      expect.arrayContaining(['processPayment', '*', 'localHelper'])
    );
    expect(parsed.exports.find((e) => e.name === 'processPayment')?.fromModule).toBe('./payment');
  });

  it('follows a one-hop barrel re-export to the concrete symbol', () => {
    const payment = {
      path: 'src/payment.ts',
      content: 'export function pay() { return 1; }',
      symbols: [{ id: 'sym-pay', name: 'pay' }],
      exports: [{ name: 'pay' }]
    };
    const barrel = {
      path: 'src/index.ts',
      content: "export { pay as processPayment } from './payment';",
      symbols: [],
      exports: [{ name: 'processPayment' }]
    };
    const filesByPath = new Map([
      [payment.path, payment],
      [barrel.path, barrel]
    ]);
    const knownFiles = new Set(filesByPath.keys());

    const id = resolveImportedSymbolId({
      targetFile: barrel,
      binding: { module: './index', kind: 'named', importedName: 'processPayment' },
      filesByPath,
      knownFiles
    });
    expect(id).toBe('sym-pay');
  });

  it('follows export * barrels to the defining module', () => {
    const ledger = {
      path: 'src/ledger.ts',
      content: 'export function post() { return 1; }',
      symbols: [{ id: 'sym-post', name: 'post' }],
      exports: [{ name: 'post' }]
    };
    const barrel = {
      path: 'src/index.ts',
      content: "export * from './ledger';",
      symbols: [],
      exports: []
    };
    const filesByPath = new Map([
      [ledger.path, ledger],
      [barrel.path, barrel]
    ]);
    const knownFiles = new Set(filesByPath.keys());

    expect(
      resolveImportedSymbolId({
        targetFile: barrel,
        binding: { module: '.', kind: 'named', importedName: 'post' },
        filesByPath,
        knownFiles
      })
    ).toBe('sym-post');
  });

  it('does not invent a symbol across an unresolved re-export', () => {
    const barrel = {
      path: 'src/index.ts',
      content: "export { missing } from './gone';",
      symbols: [],
      exports: [{ name: 'missing' }]
    };
    const filesByPath = new Map([[barrel.path, barrel]]);
    expect(
      resolveImportedSymbolId({
        targetFile: barrel,
        binding: { module: '.', kind: 'named', importedName: 'missing' },
        filesByPath,
        knownFiles: new Set([barrel.path])
      })
    ).toBeNull();
  });

  it('bounds cyclic re-export chains', () => {
    const a = {
      path: 'src/a.ts',
      content: "export { x } from './b';",
      symbols: [],
      exports: [{ name: 'x' }]
    };
    const b = {
      path: 'src/b.ts',
      content: "export { x } from './a';",
      symbols: [],
      exports: [{ name: 'x' }]
    };
    const filesByPath = new Map([
      [a.path, a],
      [b.path, b]
    ]);
    expect(
      resolveImportedSymbolId({
        targetFile: a,
        binding: { module: '.', kind: 'named', importedName: 'x' },
        filesByPath,
        knownFiles: new Set(filesByPath.keys())
      })
    ).toBeNull();
  });
});
