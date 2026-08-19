"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const reviewPolicy_1 = require("./reviewPolicy");
(0, vitest_1.describe)('parseReviewPolicy', () => {
    (0, vitest_1.it)('uses defaults when config is missing', () => {
        const policy = (0, reviewPolicy_1.parseReviewPolicy)(undefined);
        (0, vitest_1.expect)(policy.enabled).toBe(true);
        (0, vitest_1.expect)(policy.failOn).toContain('CRITICAL');
    });
    (0, vitest_1.it)('parses fail and warn severities from yaml', () => {
        const policy = (0, reviewPolicy_1.parseReviewPolicy)(`
review:
  enabled: true
  severity:
    fail: [CRITICAL]
    warn: [HIGH]
`);
        (0, vitest_1.expect)(policy.failOn).toEqual(['CRITICAL']);
        (0, vitest_1.expect)(policy.warnOn).toEqual(['HIGH']);
    });
});
(0, vitest_1.describe)('evaluateReviewOutcome', () => {
    (0, vitest_1.it)('returns FAIL when a configured severity is present', () => {
        const outcome = (0, reviewPolicy_1.evaluateReviewOutcome)({
            findings: [
                {
                    title: 'Bug',
                    severity: 'HIGH',
                    category: 'correctness',
                    confidence: 'HIGH'
                }
            ],
            policy: (0, reviewPolicy_1.parseReviewPolicy)('fail: [HIGH]')
        });
        (0, vitest_1.expect)(outcome).toBe('FAIL');
    });
    (0, vitest_1.it)('returns PASS when only low-confidence findings exist', () => {
        const outcome = (0, reviewPolicy_1.evaluateReviewOutcome)({
            findings: [
                {
                    title: 'Maybe',
                    severity: 'HIGH',
                    category: 'style',
                    confidence: 'LOW'
                }
            ]
        });
        (0, vitest_1.expect)(outcome).toBe('PASS');
    });
});
(0, vitest_1.describe)('finding fingerprints', () => {
    (0, vitest_1.it)('creates stable fingerprints and compares review runs', () => {
        const fingerprint = (0, reviewPolicy_1.findingFingerprint)({
            category: 'testing',
            title: 'Missing test',
            evidence: [{ file: 'src/a.ts', lines: [1, 3] }]
        });
        const comparison = (0, reviewPolicy_1.compareFindingFingerprints)({
            current: [fingerprint, 'other:new'],
            previous: [fingerprint, 'other:old']
        });
        (0, vitest_1.expect)(comparison.persistent).toEqual([fingerprint]);
        (0, vitest_1.expect)(comparison.newFindings).toEqual(['other:new']);
        (0, vitest_1.expect)(comparison.resolved).toEqual(['other:old']);
    });
});
