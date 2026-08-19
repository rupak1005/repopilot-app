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
  evidence?: Array<{ file: string; lines: [number, number] }>;
};

const DEFAULT_POLICY: ReviewPolicyConfig = {
  enabled: true,
  failOn: ['CRITICAL', 'HIGH'],
  warnOn: ['MEDIUM']
};

export function defaultReviewPolicy(): ReviewPolicyConfig {
  return { ...DEFAULT_POLICY, failOn: [...DEFAULT_POLICY.failOn], warnOn: [...DEFAULT_POLICY.warnOn] };
}

export function parseReviewPolicy(raw: string | null | undefined): ReviewPolicyConfig {
  if (!raw?.trim()) return defaultReviewPolicy();

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

function parseSeverityList(value: string): ReviewPolicyConfig['failOn'] {
  return value
    .split(',')
    .map((part) => part.trim().toUpperCase())
    .filter((part): part is ReviewPolicyConfig['failOn'][number] =>
      ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(part)
    );
}

export function evaluateReviewOutcome(args: {
  findings: PolicyFinding[];
  policy?: ReviewPolicyConfig;
  incomplete?: boolean;
}): ReviewOutcome {
  if (args.incomplete) return 'INCOMPLETE';
  const policy = args.policy ?? defaultReviewPolicy();
  if (!policy.enabled) return 'PASS';

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

export function findingFingerprint(finding: {
  category: string;
  title: string;
  evidence?: Array<{ file: string; lines: [number, number] }>;
}): string {
  const file = finding.evidence?.[0]?.file ?? 'unknown';
  return `${finding.category}:${finding.title}:${file}`.toLowerCase();
}

export function compareFindingFingerprints(args: {
  current: string[];
  previous: string[];
}): {
  persistent: string[];
  resolved: string[];
  newFindings: string[];
} {
  const currentSet = new Set(args.current);
  const previousSet = new Set(args.previous);

  return {
    persistent: args.current.filter((fingerprint) => previousSet.has(fingerprint)),
    resolved: args.previous.filter((fingerprint) => !currentSet.has(fingerprint)),
    newFindings: args.current.filter((fingerprint) => !previousSet.has(fingerprint))
  };
}

export function outcomeToCheckConclusion(
  outcome: ReviewOutcome
): 'success' | 'failure' | 'neutral' {
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
