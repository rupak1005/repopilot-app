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
};

export function ReviewFindingCard({
  finding,
  repoId,
  repoFullName,
  revisionSha
}: ReviewFindingCardProps) {
  return (
    <article className="ui-finding-card">
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
          <strong>Suggested:</strong> {finding.suggestedAction}
        </p>
      ) : null}
      {finding.evidence.length > 0 ? (
        <div className="ui-finding-card__evidence">
          <span className="label-caps">Evidence</span>
          <div className="ui-finding-card__chips">
            {finding.evidence.map((item) => (
              <span key={`${item.type}:${item.file}:${item.lines[0]}`} className="ui-finding-card__chip-wrap">
                <span className="ui-finding-card__chip-type">{item.type}</span>
                <CitationChip
                  file={item.file}
                  lines={item.lines}
                  repoId={repoId}
                  repoFullName={repoFullName}
                  revisionSha={revisionSha ?? undefined}
                />
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
