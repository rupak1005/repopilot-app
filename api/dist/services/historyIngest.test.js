"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const historyIngest_1 = require("./historyIngest");
(0, vitest_1.describe)('parseGitLogOutput', () => {
    (0, vitest_1.it)('parses commit metadata and changed files', () => {
        const output = [
            'COMMIT|abc123|Alice|alice@example.com|2026-01-02T10:00:00+00:00|Add helper',
            'M\tsrc/util.ts',
            'A\tsrc/new.ts',
            'COMMIT|def456|Bob|bob@example.com|2026-01-03T10:00:00+00:00|Remove legacy',
            'D\tsrc/old.ts'
        ].join('\n');
        const commits = (0, historyIngest_1.parseGitLogOutput)(output);
        (0, vitest_1.expect)(commits).toHaveLength(2);
        (0, vitest_1.expect)(commits[0]?.sha).toBe('abc123');
        (0, vitest_1.expect)(commits[0]?.files).toEqual([
            { filePath: 'src/util.ts', changeType: 'modified' },
            { filePath: 'src/new.ts', changeType: 'added' }
        ]);
        (0, vitest_1.expect)(commits[1]?.files[0]).toEqual({
            filePath: 'src/old.ts',
            changeType: 'deleted'
        });
    });
});
(0, vitest_1.describe)('coChangePairsForCommit', () => {
    (0, vitest_1.it)('generates sorted unique pairs with cap', () => {
        const pairs = (0, historyIngest_1.coChangePairsForCommit)(['b.ts', 'a.ts', 'c.ts'], 3);
        (0, vitest_1.expect)(pairs).toEqual([
            ['a.ts', 'b.ts'],
            ['a.ts', 'c.ts'],
            ['b.ts', 'c.ts']
        ]);
    });
});
(0, vitest_1.describe)('hotspot scoring', () => {
    (0, vitest_1.it)('ranks higher-change higher-dependency files higher', () => {
        const low = (0, historyIngest_1.computeHotspotScore)({
            changeCount: 1,
            dependentCount: 0,
            coChangeCount: 0,
            findingsCount: 0
        });
        const high = (0, historyIngest_1.computeHotspotScore)({
            changeCount: 10,
            dependentCount: 5,
            coChangeCount: 3,
            findingsCount: 2
        });
        (0, vitest_1.expect)(high).toBeGreaterThan(low);
    });
    (0, vitest_1.it)('builds human-readable reasons', () => {
        const reasons = (0, historyIngest_1.hotspotExplanation)({
            changeCount: 4,
            dependentCount: 2,
            coChangeCount: 1,
            findingsCount: 1
        });
        (0, vitest_1.expect)(reasons.length).toBe(4);
    });
});
