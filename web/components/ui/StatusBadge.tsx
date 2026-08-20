import type { ReactNode } from 'react';

export type StatusBadgeVariant = 'success' | 'warn' | 'fail' | 'muted';

export function reviewStatusVariant(status: string | null): StatusBadgeVariant {
  const s = (status ?? '').toLowerCase();
  if (s.includes('fail') || s.includes('error')) return 'fail';
  if (s.includes('warn') || s.includes('review')) return 'warn';
  if (s.includes('pass') || s.includes('complete') || s.includes('merge')) return 'success';
  return 'muted';
}

type StatusBadgeProps = {
  variant: StatusBadgeVariant;
  children: ReactNode;
};

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span className={`ui-status-badge ui-status-badge--${variant}`}>
      <span className="ui-status-badge__dot" aria-hidden />
      <span className="ui-status-badge__label">{children}</span>
    </span>
  );
}
