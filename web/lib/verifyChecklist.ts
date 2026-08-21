import type { ImpactTestPlan } from '@repopilot/common';

export type VerifyChecklistItem = {
  id: string;
  label: string;
  detail?: string;
  command?: string;
};

/** One checklist row per classified test-plan command. */
export function verifyItemsFromTestPlan(plan: ImpactTestPlan | null | undefined): VerifyChecklistItem[] {
  if (!plan?.commands.length) return [];
  return plan.commands.map((cmd, index) => ({
    id: `cmd:${cmd.packageName ?? 'root'}:${index}`,
    label: cmd.packageName ? `Run ${cmd.packageName} tests` : 'Run root vitest',
    detail: cmd.files.slice(0, 4).join(', ') + (cmd.files.length > 4 ? '…' : ''),
    command: cmd.command
  }));
}

export function verifyStorageKey(repoId: string, scope: string): string {
  return `repopilot:verify:${repoId}:${scope}`;
}

const memoryStore = new Map<string, string>();

function storageGet(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      /* fall through */
    }
  }
  return memoryStore.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      /* fall through */
    }
  }
  memoryStore.set(key, value);
}

export function loadVerifyChecked(key: string): Record<string, boolean> {
  try {
    const raw = storageGet(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'boolean') out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveVerifyChecked(key: string, checked: Record<string, boolean>): void {
  try {
    storageSet(key, JSON.stringify(checked));
  } catch {
    /* ignore */
  }
}

export function verifyProgress(
  items: VerifyChecklistItem[],
  checked: Record<string, boolean>
): { done: number; total: number; complete: boolean } {
  const total = items.length;
  const done = items.filter((item) => checked[item.id]).length;
  return { done, total, complete: total > 0 && done === total };
}
