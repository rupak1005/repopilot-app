import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/** Target id for skip links and the primary content landmark. */
export const MAIN_CONTENT_ID = 'main-content';

export function isActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

type RowLinkHandlers = {
  className: string;
  tabIndex: 0;
  role: 'link';
  onClick: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

/** Make a whole table row open like a link (click + Enter/Space). */
export function rowLinkProps(onActivate: () => void, className = 'ui-data-table__row-link'): RowLinkHandlers {
  return {
    className,
    tabIndex: 0,
    role: 'link',
    onClick: () => onActivate(),
    onKeyDown: (event) => {
      if (!isActivationKey(event.key)) return;
      event.preventDefault();
      onActivate();
    }
  };
}

export function firstFocusable(root: ParentNode | null): HTMLElement | null {
  return focusables(root)[0] ?? null;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root: ParentNode | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/** Keep Tab cycling inside a modal root (call from keydown). */
export function trapFocus(root: ParentNode, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const nodes = focusables(root);
  if (nodes.length === 0) return;
  const first = nodes[0]!;
  const last = nodes[nodes.length - 1]!;
  const active = document.activeElement;
  if (event.shiftKey) {
    if (active === first || (active instanceof Node && !root.contains(active))) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last) {
    event.preventDefault();
    first.focus();
  }
}
