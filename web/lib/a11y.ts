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
  if (!root) return null;
  return root.querySelector<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
}
