import type { SearchHit } from '../../lib/types';
import { CitationChip } from './CitationChip';

type SearchHitRowProps = {
  hit: SearchHit;
};

/** Phase 7 — semantic search result row. */
export function SearchHitRow({ hit }: SearchHitRowProps) {
  return (
    <li className="ui-search-hit">
      <div className="ui-search-hit__head">
        <CitationChip file={hit.file} lines={hit.lines} score={hit.score} />
      </div>
      <pre className="ui-search-hit__snippet">{hit.text.slice(0, 280)}</pre>
    </li>
  );
}
