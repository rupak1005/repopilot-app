import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

/** Phase 16 — structured empty placeholder with optional icon and action. */
export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  compact = false,
  className
}: EmptyStateProps) {
  const classes = [
    'ui-empty-state',
    compact ? 'ui-empty-state--compact' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status">
      {IconComponent ? (
        <span className="ui-empty-state__icon" aria-hidden>
          <IconComponent size={compact ? 20 : 28} weight="light" />
        </span>
      ) : null}
      <p className="ui-empty-state__title">{title}</p>
      {description ? <p className="ui-empty-state__desc">{description}</p> : null}
      {action ? <div className="ui-empty-state__action">{action}</div> : null}
    </div>
  );
}
