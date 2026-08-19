import Link from 'next/link';
import { CaretDown, GitBranch } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useTapMotion } from '../../lib/motion';

const MotionLink = motion.create(Link);

type RepoPickerProps = {
  repoFullName: string;
  href?: string;
};

export function splitRepoFullName(fullName: string): { owner: string; name: string } {
  const slash = fullName.indexOf('/');
  if (slash === -1) return { owner: '', name: fullName };
  return { owner: fullName.slice(0, slash), name: fullName.slice(slash + 1) };
}

/** Phase 2 primitive — topbar repository switcher. */
export function RepoPicker({ repoFullName, href = '/repos' }: RepoPickerProps) {
  const { owner, name } = splitRepoFullName(repoFullName);
  const tap = useTapMotion(0.99);

  return (
    <MotionLink href={href} className="ui-repo-picker" {...tap}>
      <span className="ui-repo-picker__glyph" aria-hidden>
        <GitBranch size={14} weight="light" />
      </span>
      <span className="ui-repo-picker__label">
        {owner ? (
          <>
            <span className="ui-repo-picker__owner">{owner}</span>
            <span className="ui-repo-picker__sep">/</span>
          </>
        ) : null}
        <span className="ui-repo-picker__name">{name || repoFullName}</span>
      </span>
      <span className="ui-repo-picker__caret" aria-hidden>
        <CaretDown size={12} weight="light" />
      </span>
    </MotionLink>
  );
}
