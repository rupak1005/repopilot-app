/** When to auto-open the indexing float (AppShell). Dismiss mid-run must not reopen. */

export function nextIndexFloatStartedFor(args: {
  demoMode: boolean;
  repoId: string | null | undefined;
  indexing: boolean;
  startedFor: string | null;
}): string | null {
  if (args.demoMode || !args.repoId) return args.startedFor;
  if (!args.indexing) return null;
  return args.startedFor ?? args.repoId;
}

export function shouldAutoStartIndexFloat(args: {
  demoMode: boolean;
  repoId: string | null | undefined;
  indexing: boolean;
  startedFor: string | null;
  activeJobRepoId: string | null | undefined;
}): boolean {
  if (args.demoMode || !args.repoId || !args.indexing) return false;
  if (args.startedFor === args.repoId) return false;
  return args.activeJobRepoId !== args.repoId;
}
