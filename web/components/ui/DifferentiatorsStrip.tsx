import Link from 'next/link';
import {
  Crosshair,
  Flame,
  GitPullRequest,
  Graph,
  Lightning,
  PlugsConnected,
  type Icon
} from '@phosphor-icons/react';
import {
  DIFFERENTIATOR_TAGLINE,
  REPO_PILOT_DIFFERENTIATORS,
  type DifferentiatorIcon
} from '../../lib/differentiators';

const ICONS: Record<DifferentiatorIcon, Icon> = {
  graph: Graph,
  impact: Crosshair,
  hotspots: Flame,
  ask: Lightning,
  reviews: GitPullRequest,
  mcp: PlugsConnected
};

type DifferentiatorsStripProps = {
  title?: string;
  /** When set, cards link into the dashboard, e.g. `/dashboard/{repoId}` */
  repoBase?: string;
  showTagline?: boolean;
  className?: string;
};

export function DifferentiatorsStrip({
  title = 'Why RepoPilot',
  repoBase,
  showTagline = false,
  className
}: DifferentiatorsStripProps) {
  const rootClass = ['diff-strip', className].filter(Boolean).join(' ');

  return (
    <section className={rootClass} aria-label={title}>
      <div className="diff-strip__head">
        <h2 className="diff-strip__title">{title}</h2>
        {showTagline ? <p className="diff-strip__tagline">{DIFFERENTIATOR_TAGLINE}</p> : null}
      </div>
      <ul className="diff-strip__grid">
        {REPO_PILOT_DIFFERENTIATORS.map((item) => {
          const IconComponent = ICONS[item.icon];
          const href = (() => {
            if (!item.path) return null;
            if (item.id === 'mcp') {
              return repoBase ? `${repoBase}/mcp` : '/mcp';
            }
            return repoBase ? `${repoBase}${item.path}` : null;
          })();
          const body = (
            <>
              <span className="diff-card__icon" aria-hidden>
                <IconComponent size={18} weight="bold" />
              </span>
              <span className="diff-card__text">
                <span className="diff-card__title">{item.title}</span>
                <span className="diff-card__desc">{item.description}</span>
              </span>
            </>
          );

          return (
            <li key={item.id}>
              {href ? (
                <Link href={href} className="diff-card diff-card--link">
                  {body}
                </Link>
              ) : (
                <div className="diff-card">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
