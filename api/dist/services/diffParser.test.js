"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const diffParser_1 = require("./diffParser");
(0, vitest_1.describe)('parseUnifiedDiff', () => {
    (0, vitest_1.it)('parses added and removed lines with line numbers', () => {
        const patch = [
            '@@ -1,3 +1,4 @@',
            ' context',
            '-removed',
            '+added',
            ' trailing'
        ].join('\n');
        const hunks = (0, diffParser_1.parseUnifiedDiff)(patch);
        (0, vitest_1.expect)(hunks).toHaveLength(1);
        (0, vitest_1.expect)(hunks[0]?.oldStart).toBe(1);
        (0, vitest_1.expect)(hunks[0]?.newStart).toBe(1);
        (0, vitest_1.expect)(hunks[0]?.lines).toEqual([
            { type: 'context', content: 'context', oldLine: 1, newLine: 1 },
            { type: 'removed', content: 'removed', oldLine: 2 },
            { type: 'added', content: 'added', newLine: 2 },
            { type: 'context', content: 'trailing', oldLine: 3, newLine: 3 }
        ]);
    });
});
(0, vitest_1.describe)('buildFileChange', () => {
    (0, vitest_1.it)('counts additions and deletions', () => {
        const change = (0, diffParser_1.buildFileChange)({
            path: 'src/example.ts',
            status: 'modified',
            patch: '@@ -1,2 +1,2 @@\n-old\n+new\n'
        });
        (0, vitest_1.expect)(change.additions).toBe(1);
        (0, vitest_1.expect)(change.deletions).toBe(1);
        (0, vitest_1.expect)(change.path).toBe('src/example.ts');
    });
});
