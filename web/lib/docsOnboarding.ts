export type OnboardingStep = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

/** Ordered first-run checklist for docs / onboarding. */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'open',
    title: 'Open a repository',
    detail: 'Paste a GitHub URL on the home page or pick one after signing in.',
    href: '/'
  },
  {
    id: 'index',
    title: 'Wait for indexing (or re-index)',
    detail: 'Watch the progress pill, then use Settings → Re-index if the SHA looks stale.',
    href: '/docs/getting-started'
  },
  {
    id: 'overview',
    title: 'Scan Overview',
    detail: 'Pulse board shows index health and jumps into Ask, graph, impact, and history.',
    href: '/docs/getting-started'
  },
  {
    id: 'investigate',
    title: 'Run impact or Ask',
    detail: 'Trace blast radius for a file, or ask a question and open Graph / Impact from citations.',
    href: '/docs/getting-started'
  },
  {
    id: 'agents',
    title: 'Connect an MCP client',
    detail: 'Point your editor at RepoPilot MCP for search, impact, and Ask against the same index.',
    href: '/docs/mcp'
  }
];

export function onboardingStepCount(): number {
  return ONBOARDING_STEPS.length;
}
