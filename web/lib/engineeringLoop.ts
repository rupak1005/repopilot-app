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

export function parseEngineeringLoopPull(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') return null;
  const n = Number(value.trim());
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

/**
 * Ordered stages for Plan → agent → PR → impact → review → verify.
 * When `pullNumber` is set, PR/Review deep-link to that pull and Impact uses pull mode.
 */
export function engineeringLoopStages(args: {
  repoId: string;
  filePath: string;
  revisionSha?: string | null;
  pullNumber?: number | null;
}): EngineeringLoopStage[] {
  const { repoId, filePath, revisionSha = null } = args;
  const pull =
    args.pullNumber != null && Number.isFinite(args.pullNumber) && args.pullNumber >= 1
      ? Math.floor(args.pullNumber)
      : null;
  const base = `/dashboard/${repoId}`;
  const planParams = new URLSearchParams({ file: filePath });
  if (pull) planParams.set('pull', String(pull));
  const impact = pull
    ? impactHref(repoId, { pull, file: filePath || undefined, revisionSha })
    : impactHref(repoId, { file: filePath, revisionSha });
  const pullHref = pull ? `${base}/pulls/${pull}` : `${base}/pulls`;

  return [
    {
      id: 'plan',
      label: 'Plan',
      blurb: 'Rank the change and confirm blast radius.',
      href: `${base}/planning?${planParams.toString()}`
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
      blurb: pull
        ? `Open pull request #${pull}.`
        : 'Open or pick the pull that carries the change.',
      href: pullHref
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
      blurb: pull
        ? `Run RepoPilot review on PR #${pull}.`
        : 'Run RepoPilot review on the PR detail page.',
      href: pullHref
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
  pullNumber?: number | null;
}): string {
  const pull =
    args.pullNumber != null && Number.isFinite(args.pullNumber) && args.pullNumber >= 1
      ? Math.floor(args.pullNumber)
      : null;
  const pack = mcpContextPackSnippet({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
    question: args.question ?? `what breaks if ${args.filePath} changes?`
  });
  return [
    `# RepoPilot engineering loop brief`,
    `File: ${args.filePath}`,
    pull ? `Pull: #${pull}` : null,
    ``,
    `## Agent context`,
    pack,
    `find_impact({ filePath: ${JSON.stringify(args.filePath)}, repositoryId: ${JSON.stringify(args.repositoryId)} })`,
    ``,
    `## After the change`,
    `1. Re-open Impact for this file and copy Local run commands (testPlan).`,
    pull
      ? `2. Review PR #${pull} on the pull detail page (trigger RepoPilot review if needed).`
      : `2. Open a PR, then trigger RepoPilot review from the pull detail page.`,
    `3. Confirm blast radius / similar past PRs before merge.`,
    ``,
    `Graph blast (optional): architecture?file=${encodeURIComponent(args.filePath)}&blast=1`
  ]
    .filter((line) => line != null)
    .join('\n');
}

/** Keep architecture deep-link helper reachable for planning cards. */
export { architectureHref };
