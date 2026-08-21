import { mcpContextPackSnippet } from './mcpConnect';
import { architectureHref, impactHref } from './revisionScope';

export type EngineeringLoopStageId =
  | 'plan'
  | 'agent'
  | 'pr'
  | 'impact'
  | 'review'
  | 'verify';

export type EngineeringLoopStage = {
  id: EngineeringLoopStageId;
  label: string;
  blurb: string;
  /** Dashboard path when the stage navigates; null when clipboard-only. */
  href: string | null;
};

export const ENGINEERING_LOOP_ORDER: EngineeringLoopStageId[] = [
  'plan',
  'agent',
  'pr',
  'impact',
  'review',
  'verify'
];

/**
 * Ordered stages for Plan → agent → PR → impact → review → verify.
 * Pure URL/copy handoff — no remote agent or CI execution.
 */
export function engineeringLoopStages(args: {
  repoId: string;
  filePath: string;
  revisionSha?: string | null;
}): EngineeringLoopStage[] {
  const { repoId, filePath, revisionSha = null } = args;
  const base = `/dashboard/${repoId}`;
  const impact = impactHref(repoId, { file: filePath, revisionSha });

  return [
    {
      id: 'plan',
      label: 'Plan',
      blurb: 'Rank the change and confirm blast radius.',
      href: `${base}/planning?file=${encodeURIComponent(filePath)}`
    },
    {
      id: 'agent',
      label: 'Agent',
      blurb: 'Hand a context pack to Cursor / MCP.',
      href: `${base}/mcp`
    },
    {
      id: 'pr',
      label: 'PR',
      blurb: 'Open or pick the pull that carries the change.',
      href: `${base}/pulls`
    },
    {
      id: 'impact',
      label: 'Impact',
      blurb: 'Re-check dependents, risk, and similar history.',
      href: impact
    },
    {
      id: 'review',
      label: 'Review',
      blurb: 'Run RepoPilot review on the PR detail page.',
      href: `${base}/pulls`
    },
    {
      id: 'verify',
      label: 'Verify',
      blurb: 'Copy classified test commands from Impact and run locally.',
      href: impact
    }
  ];
}

/** Clipboard brief for IDE agents — context pack + loop reminders. */
export function engineeringAgentBrief(args: {
  repositoryId: string;
  filePath: string;
  question?: string;
}): string {
  const pack = mcpContextPackSnippet({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
    question: args.question ?? `what breaks if ${args.filePath} changes?`
  });
  return [
    `# RepoPilot engineering loop brief`,
    `File: ${args.filePath}`,
    ``,
    `## Agent context`,
    pack,
    `find_impact({ filePath: ${JSON.stringify(args.filePath)}, repositoryId: ${JSON.stringify(args.repositoryId)} })`,
    ``,
    `## After the change`,
    `1. Re-open Impact for this file and copy Local run commands (testPlan).`,
    `2. Open a PR, then trigger RepoPilot review from the pull detail page.`,
    `3. Confirm blast radius / similar past PRs before merge.`,
    ``,
    `Graph blast (optional): architecture?file=${encodeURIComponent(args.filePath)}&blast=1`
  ].join('\n');
}

/** Keep architecture deep-link helper reachable for planning cards. */
export { architectureHref };
