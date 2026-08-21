import { describe, expect, it } from 'vitest';
import { extractStaticDynamicImportSpecifiers, extractStaticDynamicImports } from './dynamicImports';
import { resolveJsModule } from './moduleResolve';
import {
  collectPackageExportsFromFiles,
  flattenExportTarget,
  parsePackageExports,
  resolvePackageExportSpecifier
} from './packageExports';
import { parseCodeToRecords } from './treeSitterParser';
import { SOURCE_FILE_PATTERNS } from './fileDiscovery';

describe('packageExports', () => {
  it('flattens conditional export targets', () => {
    expect(
      flattenExportTarget({
        import: './dist/esm/index.js',
        require: './dist/cjs/index.js',
        types: './dist/index.d.ts'
      })
    ).toEqual(
      expect.arrayContaining([
        './dist/esm/index.js',
        './dist/cjs/index.js',
        './dist/index.d.ts'
      ])
    );
  });

  it('resolves workspace package name and subpath via exports', () => {
    const pkg = parsePackageExports(
      JSON.stringify({
        name: '@acme/payments',
        exports: {
          '.': './src/index.ts',
          './ledger': './src/ledger.ts',
          './utils/*': './src/utils/*'
        }
      }),
      'packages/payments/package.json'
    );
    expect(pkg?.name).toBe('@acme/payments');

    const known = new Set([
      'packages/payments/package.json',
      'packages/payments/src/index.ts',
      'packages/payments/src/ledger.ts',
      'packages/payments/src/utils/money.ts',
      'apps/web/src/app.ts'
    ]);
    const packages = collectPackageExportsFromFiles([
      {
        path: 'packages/payments/package.json',
        content: JSON.stringify({
          name: '@acme/payments',
          exports: {
            '.': './src/index.ts',
            './ledger': './src/ledger.ts',
            './utils/*': './src/utils/*'
          }
        })
      }
    ]);

    expect(resolvePackageExportSpecifier('@acme/payments', known, packages)).toBe(
      'packages/payments/src/index.ts'
    );
    expect(resolvePackageExportSpecifier('@acme/payments/ledger', known, packages)).toBe(
      'packages/payments/src/ledger.ts'
    );
    expect(resolvePackageExportSpecifier('@acme/payments/utils/money', known, packages)).toBe(
      'packages/payments/src/utils/money.ts'
    );
    expect(resolveJsModule('apps/web/src/app.ts', '@acme/payments/ledger', known, [], packages)).toBe(
      'packages/payments/src/ledger.ts'
    );
    expect(resolvePackageExportSpecifier('lodash', known, packages)).toBeNull();
  });

  it('falls back to main when exports are absent', () => {
    const packages = collectPackageExportsFromFiles([
      {
        path: 'packages/core/package.json',
        content: JSON.stringify({ name: '@acme/core', main: './src/main.ts' })
      }
    ]);
    const known = new Set(['packages/core/src/main.ts', 'packages/core/package.json']);
    expect(resolvePackageExportSpecifier('@acme/core', known, packages)).toBe(
      'packages/core/src/main.ts'
    );
  });
});

describe('static dynamic import()', () => {
  it('extracts literal import() and skips templates', () => {
    const code = `
      const a = await import('./payment');
      const b = import("@acme/payments/ledger");
      const c = import(\`./\${name}\`);
    `;
    expect(extractStaticDynamicImportSpecifiers(code)).toEqual([
      './payment',
      '@acme/payments/ledger'
    ]);
    expect(extractStaticDynamicImports(code)[0]?.sourceLine).toBe(2);
  });

  it('records dynamic imports during parse', () => {
    const parsed = parseCodeToRecords(
      'src/boot.ts',
      `
        import { start } from './start';
        export async function boot() {
          await import('./plugins/auth');
        }
      `
    );
    expect(parsed.imports.map((i) => i.module)).toEqual(
      expect.arrayContaining(['./start', './plugins/auth'])
    );
  });
});

describe('config discovery', () => {
  it('includes package.json and tsconfig in source patterns', () => {
    expect(SOURCE_FILE_PATTERNS).toContain('**/package.json');
    expect(SOURCE_FILE_PATTERNS).toContain('**/tsconfig.json');
    expect(parseCodeToRecords('packages/x/package.json', '{"name":"x"}')).toEqual({
      symbols: [],
      imports: [],
      exports: []
    });
  });
});
