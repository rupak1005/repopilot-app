import Link from 'next/link';
import { FileCode } from '@phosphor-icons/react';
import {
  citationArchitectureHref,
  citationGithubUrl,
  citationImpactHref
} from '../../lib/citationLinks';

type CitationChipProps = {
  file: string;
  lines: [number, number];
  score?: number;
  /** When set, show Graph / Impact / GitHub actions. */
  repoId?: string | null;
  repoFullName?: string | null;
  revisionSha?: string;
};

export function CitationChip({
  file,
  lines,
  score,
  repoId,
  repoFullName,
  revisionSha
}: CitationChipProps) {
  const label = `${file}:${lines[0]}–${lines[1]}`;
  const showActions = Boolean(repoId);

  return (
    <span className={`ui-citation${showActions ? ' ui-citation--actions' : ''}`}>
      <span className="ui-citation-chip">
        <FileCode size={14} weight="light" aria-hidden />
        <span className="ui-citation-chip__label" title={label}>
          {label}
        </span>
        {score != null ? (
          <span className="ui-citation-chip__score">{score.toFixed(2)}</span>
        ) : null}
      </span>
      {repoId ? (
        <span className="ui-citation__actions" role="group" aria-label={`Open ${file}`}>
          <Link className="ui-citation__action" href={citationArchitectureHref(repoId, file, revisionSha)}>
            Graph
          </Link>
          <Link className="ui-citation__action" href={citationImpactHref(repoId, file, revisionSha)}>
            Impact
          </Link>
          {repoFullName?.includes('/') ? (
            <a
              className="ui-citation__action"
              href={citationGithubUrl(repoFullName, file, lines, revisionSha)}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
