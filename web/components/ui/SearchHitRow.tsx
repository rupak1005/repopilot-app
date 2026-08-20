import type { SearchHit } from '../../lib/types';
import { CitationChip } from './CitationChip';
import { CodeSnippet } from './CodeSnippet';

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
      <CodeSnippet className="ui-search-hit__snippet" code={hit.text} filePath={hit.file} />
    </li>
  );
}
