import type { CSSProperties, ReactNode } from 'react';

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  radius?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
};

function dim(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export function Skeleton({ width, height = 14, radius = 'sm', className }: SkeletonProps) {
  const style: CSSProperties = {
    width: dim(width),
    height: dim(height)
  };
  const classes = ['ui-skeleton', `ui-skeleton--${radius}`, className].filter(Boolean).join(' ');
  return <span className={classes} style={style} aria-hidden />;
}

type SkeletonBlockProps = {
  lines?: number;
  className?: string;
};

/** Compact text-block placeholder for list/page loading. */
export function SkeletonBlock({ lines = 3, className }: SkeletonBlockProps) {
  const widths = ['92%', '76%', '64%', '84%', '70%'];
  return (
    <div
      className={['ui-skeleton-block', className].filter(Boolean).join(' ')}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} height={12} />
      ))}
    </div>
  );
}

type PageLoadingProps = {
  label?: string;
  children?: ReactNode;
  className?: string;
};

/** Loading shell — use this instead of EmptyState for in-flight work. */
export function PageLoading({ label = 'Loading…', children, className }: PageLoadingProps) {
  return (
    <div
      className={['ui-page-loading', className].filter(Boolean).join(' ')}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {children ?? <SkeletonBlock lines={4} />}
      <span className="ui-page-loading__label">{label}</span>
    </div>
  );
}
