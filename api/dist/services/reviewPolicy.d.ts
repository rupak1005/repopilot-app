export type ReviewOutcome = 'PASS' | 'WARN' | 'FAIL' | 'INCOMPLETE';
export type ReviewPolicyConfig = {
    enabled: boolean;
    failOn: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'>;
    warnOn: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'>;
};
export type PolicyFinding = {
    title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    category: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    evidence?: Array<{
        file: string;
        lines: [number, number];
    }>;
};
export declare function defaultReviewPolicy(): ReviewPolicyConfig;
export declare function parseReviewPolicy(raw: string | null | undefined): ReviewPolicyConfig;
export declare function evaluateReviewOutcome(args: {
    findings: PolicyFinding[];
    policy?: ReviewPolicyConfig;
    incomplete?: boolean;
}): ReviewOutcome;
export declare function findingFingerprint(finding: {
    category: string;
    title: string;
    evidence?: Array<{
        file: string;
        lines: [number, number];
    }>;
}): string;
export declare function compareFindingFingerprints(args: {
    current: string[];
    previous: string[];
}): {
    persistent: string[];
    resolved: string[];
    newFindings: string[];
};
export declare function outcomeToCheckConclusion(outcome: ReviewOutcome): 'success' | 'failure' | 'neutral';
