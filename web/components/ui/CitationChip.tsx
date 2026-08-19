import { FileCode } from '@phosphor-icons/react';

type CitationChipProps = {
  file: string;
  lines: [number, number];
  score?: number;
};

/** Phase 6/7 — mono file:line citation chip. */
export function CitationChip({ file, lines, score }: CitationChipProps) {
  return (
    <span className="ui-citation-chip">
      <FileCode size={14} weight="light" aria-hidden />
      <span className="ui-citation-chip__label">
        {file}:{lines[0]}–{lines[1]}
      </span>
      {score != null ? (
        <span className="ui-citation-chip__score">{score.toFixed(2)}</span>
      ) : null}
    </span>
  );
}
