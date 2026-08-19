import type { AskResponse } from './types';

export type AskUserMessage = { id: string; role: 'user'; text: string };
export type AskAssistantMessage = { id: string; role: 'assistant'; response: AskResponse };
export type AskErrorMessage = { id: string; role: 'error'; text: string };
export type AskMessage = AskUserMessage | AskAssistantMessage | AskErrorMessage;

export function askStorageKey(repoId: string): string {
  return `repopilot:ask:${repoId}`;
}

export function createAskMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadAskThread(repoId: string): AskMessage[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(askStorageKey(repoId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AskMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAskThread(repoId: string, messages: AskMessage[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (messages.length === 0) {
      sessionStorage.removeItem(askStorageKey(repoId));
      return;
    }
    sessionStorage.setItem(askStorageKey(repoId), JSON.stringify(messages));
  } catch {
    // ponytail: quota exceeded — history stays in memory for this session only
  }
}

export function clearAskThread(repoId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(askStorageKey(repoId));
}
