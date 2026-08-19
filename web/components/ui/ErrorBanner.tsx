import { X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

type ErrorBannerProps = {
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
};

/** Phase 16 — page-level error alert; keeps legacy `.error-banner` styling. */
export function ErrorBanner({ children, onDismiss, className }: ErrorBannerProps) {
  const classes = ['ui-error-banner', 'error-banner', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="alert">
      <span className="ui-error-banner__text">{children}</span>
      {onDismiss ? (
        <IconButton label="Dismiss error" variant="ghost" size="sm" onClick={onDismiss}>
          <X size={14} weight="light" />
        </IconButton>
      ) : null}
    </div>
  );
}
