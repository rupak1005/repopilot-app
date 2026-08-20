import type { SearchHit } from '../../lib/types';
import { CitationChip } from './CitationChip';

type SearchHitRowProps = {
  hit: SearchHit;
  repoId?: string | null;
  repoFullName?: string | null;
};

export function SearchHitRow({ hit, repoId, repoFullName }: SearchHitRowProps) {
  return (
    <li className="ui-search-hit">
      <div className="ui-search-hit__head">
        <CitationChip
          file={hit.file}
          lines={hit.lines}
          score={hit.score}
          repoId={repoId}
          repoFullName={repoFullName}
        />
      </div>
      <pre className="ui-search-hit__snippet">{hit.text.slice(0, 280)}</pre>
    </li>
  );
}
