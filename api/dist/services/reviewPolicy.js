"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultReviewPolicy = defaultReviewPolicy;
exports.parseReviewPolicy = parseReviewPolicy;
exports.evaluateReviewOutcome = evaluateReviewOutcome;
exports.findingFingerprint = findingFingerprint;
exports.compareFindingFingerprints = compareFindingFingerprints;
exports.outcomeToCheckConclusion = outcomeToCheckConclusion;
const DEFAULT_POLICY = {
    enabled: true,
    failOn: ['CRITICAL', 'HIGH'],
    warnOn: ['MEDIUM']
};
function defaultReviewPolicy() {
    return { ...DEFAULT_POLICY, failOn: [...DEFAULT_POLICY.failOn], warnOn: [...DEFAULT_POLICY.warnOn] };
}
function parseReviewPolicy(raw) {
    if (!raw?.trim())
        return defaultReviewPolicy();
    const policy = defaultReviewPolicy();
    const enabledMatch = raw.match(/enabled:\s*(true|false)/i);
    if (enabledMatch) {
        policy.enabled = enabledMatch[1].toLowerCase() === 'true';
    }
    const failMatch = raw.match(/fail:\s*\[([^\]]*)\]/i);
    if (failMatch?.[1]) {
        policy.failOn = parseSeverityList(failMatch[1]);
    }
    const warnMatch = raw.match(/warn:\s*\[([^\]]*)\]/i);
    if (warnMatch?.[1]) {
        policy.warnOn = parseSeverityList(warnMatch[1]);
    }
    return policy;
}
function parseSeverityList(value) {
    return value
        .split(',')
        .map((part) => part.trim().toUpperCase())
        .filter((part) => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(part));
}
function evaluateReviewOutcome(args) {
    if (args.incomplete)
        return 'INCOMPLETE';
    const policy = args.policy ?? defaultReviewPolicy();
    if (!policy.enabled)
        return 'PASS';
    const actionable = args.findings.filter((finding) => finding.confidence !== 'LOW');
    const severities = actionable.map((finding) => finding.severity);
    if (severities.some((severity) => policy.failOn.includes(severity))) {
        return 'FAIL';
    }
    if (severities.some((severity) => policy.warnOn.includes(severity))) {
        return 'WARN';
    }
    return 'PASS';
}
function findingFingerprint(finding) {
    const file = finding.evidence?.[0]?.file ?? 'unknown';
    return `${finding.category}:${finding.title}:${file}`.toLowerCase();
}
function compareFindingFingerprints(args) {
    const currentSet = new Set(args.current);
    const previousSet = new Set(args.previous);
    return {
        persistent: args.current.filter((fingerprint) => previousSet.has(fingerprint)),
        resolved: args.previous.filter((fingerprint) => !currentSet.has(fingerprint)),
        newFindings: args.current.filter((fingerprint) => !previousSet.has(fingerprint))
    };
}
function outcomeToCheckConclusion(outcome) {
    switch (outcome) {
        case 'FAIL':
            return 'failure';
        case 'WARN':
        case 'INCOMPLETE':
            return 'neutral';
        default:
            return 'success';
    }
}
