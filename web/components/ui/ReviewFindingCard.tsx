import Link from 'next/link';
import { CitationChip } from './CitationChip';
import { StatusBadge, type StatusBadgeVariant } from './StatusBadge';
import type { ReviewFinding } from '../../lib/types';

function severityVariant(severity: string): StatusBadgeVariant {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return 'fail';
    case 'MEDIUM':
      return 'warn';
    case 'LOW':
      return 'muted';
    default:
      return 'muted';
  }
}

type ReviewFindingCardProps = {
  finding: ReviewFinding;
  repoId?: string | null;
  repoFullName?: string | null;
  revisionSha?: string | null;
  pullNumber?: number | null;
  pullTitle?: string | null;
  pullHref?: string | null;
};

export function ReviewFindingCard({
  finding,
  repoId,
  repoFullName,
  revisionSha,
  pullNumber,
  pullTitle,
  pullHref
}: ReviewFindingCardProps) {
  return (
    <article className="ui-finding-card">
      {pullNumber != null ? (
        <div className="ui-finding-card__pr">
          {pullHref ? (
            <Link className="ui-finding-card__pr-link" href={pullHref}>
              #{pullNumber}
            </Link>
          ) : (
            <span className="ui-finding-card__pr-link">#{pullNumber}</span>
          )}
          {pullTitle ? (
            <span className="ui-finding-card__pr-title" title={pullTitle}>
              {pullTitle}
            </span>
          ) : null}
        </div>
      ) : null}

      <header className="ui-finding-card__head">
        <h3 className="ui-finding-card__title">{finding.title}</h3>
        <div className="ui-finding-card__badges">
          <StatusBadge variant={severityVariant(finding.severity)}>{finding.severity}</StatusBadge>
          <span className="ui-finding-card__confidence label-caps">{finding.confidence} confidence</span>
        </div>
      </header>

      <p className="ui-finding-card__category label-caps">{finding.category}</p>
      <p className="ui-finding-card__desc">{finding.description}</p>

      {finding.suggestedAction ? (
        <p className="ui-finding-card__action">
          <strong>Suggested</strong>
          <span>{finding.suggestedAction}</span>
        </p>
      ) : null}

      {finding.evidence.length > 0 ? (
        <div className="ui-finding-card__evidence">
          <span className="ui-finding-card__evidence-label label-caps">Evidence</span>
          <ul className="ui-finding-card__chips">
            {finding.evidence.map((item) => (
              <li
                key={`${item.type}:${item.file}:${item.lines[0]}`}
                className="ui-finding-card__chip-wrap"
              >
                <span className="ui-finding-card__chip-type">{item.type}</span>
                <CitationChip
                  file={item.file}
                  lines={item.lines}
                  repoId={repoId}
                  repoFullName={repoFullName}
                  revisionSha={revisionSha ?? undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
