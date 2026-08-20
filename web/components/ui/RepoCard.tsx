import { GitBranch, LockSimple } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useTapMotion } from '../../lib/motion';

type RepoCardProps = {
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  updatedAt: string;
  selecting?: boolean;
  onSelect: () => void;
};

function formatUpdated(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function RepoCard({
  fullName,
  owner,
  name,
  description,
  isPrivate,
  updatedAt,
  selecting = false,
  onSelect
}: RepoCardProps) {
  const tap = useTapMotion(0.99);

  return (
    <motion.button
      type="button"
      className="ui-repo-card"
      disabled={selecting}
      onClick={onSelect}
      aria-busy={selecting}
      {...tap}
    >
      <span className="ui-repo-card__glyph" aria-hidden>
        <GitBranch size={16} weight="light" />
      </span>
      <span className="ui-repo-card__body">
        <span className="ui-repo-card__title">
          <span className="ui-repo-card__owner">{owner}</span>
          <span className="ui-repo-card__sep">/</span>
          <span className="ui-repo-card__name">{name || fullName}</span>
          {isPrivate ? (
            <span className="ui-repo-card__private" title="Private repository">
              <LockSimple size={12} weight="light" aria-hidden />
            </span>
          ) : null}
        </span>
        <span className="ui-repo-card__desc">{description ?? 'No description'}</span>
        <span className="ui-repo-card__meta">Updated {formatUpdated(updatedAt)}</span>
      </span>
    </motion.button>
  );
}
