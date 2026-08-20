import { ArrowClockwise, X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { IconButton } from './IconButton';

type ErrorBannerProps = {
  children: ReactNode;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorBanner({
  children,
  onDismiss,
  onRetry,
  retryLabel = 'Try again',
  className
}: ErrorBannerProps) {
  const classes = ['ui-error-banner', 'error-banner', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="alert">
      <span className="ui-error-banner__text">{children}</span>
      <span className="ui-error-banner__actions">
        {onRetry ? (
          <Button type="button" variant="secondary" size="sm" icon={<ArrowClockwise size={14} weight="bold" />} onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {onDismiss ? (
          <IconButton label="Dismiss error" variant="ghost" size="sm" onClick={onDismiss}>
            <X size={14} weight="light" />
          </IconButton>
        ) : null}
      </span>
    </div>
  );
}
