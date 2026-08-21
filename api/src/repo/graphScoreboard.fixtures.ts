import type { ResolveLabel, SymbolResolveLabel } from './graphScoreboard';
import type { ResolveSymbolFile } from './symbolResolve';

const PAYMENTS_PKG = JSON.stringify({
  name: '@acme/payments',
  exports: {
    '.': './src/index.ts',
    './ledger': './src/ledger.ts',
    './utils/*': './src/utils/*'
  }
});

const WEB_TSCONFIG = JSON.stringify({
  compilerOptions: {
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*'],
      '@lib/*': ['./lib/*']
    }
  }
});

/** Labeled module-resolve cases for Gate A precision/recall. */
export const MODULE_RESOLVE_LABELS: ResolveLabel[] = [
  {
    id: 'relative-ts',
    fromFile: 'src/a.ts',
    specifier: './b',
    knownFiles: ['src/a.ts', 'src/b.ts'],
    expected: 'src/b.ts'
  },
  {
    id: 'relative-index',
    fromFile: 'src/a.ts',
    specifier: './utils',
    knownFiles: ['src/a.ts', 'src/utils/index.ts'],
    expected: 'src/utils/index.ts'
  },
  {
    id: 'at-slash-heuristic',
    fromFile: 'web/lib/x.ts',
    specifier: '@/components/AppShell',
    knownFiles: ['web/lib/x.ts', 'web/components/AppShell.tsx'],
    expected: 'web/components/AppShell.tsx'
  },
  {
    id: 'tsconfig-paths',
    fromFile: 'apps/web/src/pages/home.tsx',
    specifier: '@/utils/format',
    knownFiles: [
      'apps/web/src/pages/home.tsx',
      'apps/web/src/utils/format.ts',
      'apps/web/tsconfig.json'
    ],
    configFiles: { 'apps/web/tsconfig.json': WEB_TSCONFIG },
    expected: 'apps/web/src/utils/format.ts'
  },
  {
    id: 'tsconfig-lib-prefix',
    fromFile: 'apps/web/src/app.ts',
    specifier: '@lib/money',
    knownFiles: ['apps/web/src/app.ts', 'apps/web/lib/money.ts', 'apps/web/tsconfig.json'],
    configFiles: { 'apps/web/tsconfig.json': WEB_TSCONFIG },
    expected: 'apps/web/lib/money.ts'
  },
  {
    id: 'package-exports-root',
    fromFile: 'apps/web/src/app.ts',
    specifier: '@acme/payments',
    knownFiles: [
      'apps/web/src/app.ts',
      'packages/payments/package.json',
      'packages/payments/src/index.ts'
    ],
    configFiles: { 'packages/payments/package.json': PAYMENTS_PKG },
    expected: 'packages/payments/src/index.ts'
  },
  {
    id: 'package-exports-subpath',
    fromFile: 'apps/web/src/app.ts',
    specifier: '@acme/payments/ledger',
    knownFiles: [
      'apps/web/src/app.ts',
      'packages/payments/package.json',
      'packages/payments/src/ledger.ts'
    ],
    configFiles: { 'packages/payments/package.json': PAYMENTS_PKG },
    expected: 'packages/payments/src/ledger.ts'
  },
  {
    id: 'package-exports-wildcard',
    fromFile: 'apps/web/src/app.ts',
    specifier: '@acme/payments/utils/money',
    knownFiles: [
      'apps/web/src/app.ts',
      'packages/payments/package.json',
      'packages/payments/src/utils/money.ts'
    ],
    configFiles: { 'packages/payments/package.json': PAYMENTS_PKG },
    expected: 'packages/payments/src/utils/money.ts'
  },
  {
    id: 'external-unresolved',
    fromFile: 'src/a.ts',
    specifier: 'lodash',
    knownFiles: ['src/a.ts'],
    expected: null
  },
  {
    id: 'missing-relative',
    fromFile: 'src/a.ts',
    specifier: './gone',
    knownFiles: ['src/a.ts'],
    expected: null
  },
  {
    id: 'missing-alias',
    fromFile: 'web/lib/x.ts',
    specifier: '@/missing',
    knownFiles: ['web/lib/x.ts'],
    expected: null
  },
  {
    id: 'package-main-fallback',
    fromFile: 'apps/web/src/app.ts',
    specifier: '@acme/core',
    knownFiles: [
      'apps/web/src/app.ts',
      'packages/core/package.json',
      'packages/core/src/main.ts'
    ],
    configFiles: {
      'packages/core/package.json': JSON.stringify({
        name: '@acme/core',
        main: './src/main.ts'
      })
    },
    expected: 'packages/core/src/main.ts'
  }
];

function file(
  path: string,
  content: string,
  symbols: ResolveSymbolFile['symbols'],
  exports: ResolveSymbolFile['exports'] = []
): ResolveSymbolFile {
  return { path, content, symbols, exports };
}

/** Labeled symbol-resolve cases (barrels / re-exports). */
export const SYMBOL_RESOLVE_LABELS: SymbolResolveLabel[] = [
  {
    id: 'named-reexport',
    files: {
      'src/payment.ts': file(
        'src/payment.ts',
        'export function pay() { return 1; }',
        [{ id: 'sym-pay', name: 'pay' }],
        [{ name: 'pay' }]
      ),
      'src/index.ts': file(
        'src/index.ts',
        "export { pay as processPayment } from './payment';",
        [],
        [{ name: 'processPayment' }]
      )
    },
    targetPath: 'src/index.ts',
    binding: { module: './index', kind: 'named', importedName: 'processPayment' },
    expectedSymbolId: 'sym-pay'
  },
  {
    id: 'star-reexport',
    files: {
      'src/ledger.ts': file(
        'src/ledger.ts',
        'export function post() { return 1; }',
        [{ id: 'sym-post', name: 'post' }],
        [{ name: 'post' }]
      ),
      'src/index.ts': file('src/index.ts', "export * from './ledger';", [], [])
    },
    targetPath: 'src/index.ts',
    binding: { module: '.', kind: 'named', importedName: 'post' },
    expectedSymbolId: 'sym-post'
  },
  {
    id: 'direct-local',
    files: {
      'src/pay.ts': file(
        'src/pay.ts',
        'export function pay() { return 1; }',
        [{ id: 'sym-pay', name: 'pay' }],
        [{ name: 'pay' }]
      )
    },
    targetPath: 'src/pay.ts',
    binding: { module: './pay', kind: 'named', importedName: 'pay' },
    expectedSymbolId: 'sym-pay'
  },
  {
    id: 'unresolved-reexport',
    files: {
      'src/index.ts': file(
        'src/index.ts',
        "export { missing } from './gone';",
        [],
        [{ name: 'missing' }]
      )
    },
    targetPath: 'src/index.ts',
    binding: { module: '.', kind: 'named', importedName: 'missing' },
    expectedSymbolId: null
  },
  {
    id: 'cyclic-reexport',
    files: {
      'src/a.ts': file('src/a.ts', "export { x } from './b';", [], [{ name: 'x' }]),
      'src/b.ts': file('src/b.ts', "export { x } from './a';", [], [{ name: 'x' }])
    },
    targetPath: 'src/a.ts',
    binding: { module: '.', kind: 'named', importedName: 'x' },
    expectedSymbolId: null
  }
];
