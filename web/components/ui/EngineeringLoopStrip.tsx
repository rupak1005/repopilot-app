import Link from 'next/link';
import { useState } from 'react';
import {
  engineeringAgentBrief,
  engineeringLoopStages,
  type EngineeringLoopStageId
} from '../../lib/engineeringLoop';

type EngineeringLoopStripProps = {
  repoId: string;
  filePath: string;
  revisionSha?: string | null;
  pullNumber?: number | null;
  /** Highlight the stage the user is currently on. */
  active?: EngineeringLoopStageId;
  compact?: boolean;
};

export function EngineeringLoopStrip({
  repoId,
  filePath,
  revisionSha = null,
  pullNumber = null,
  active,
  compact = false
}: EngineeringLoopStripProps) {
  const [hint, setHint] = useState<string | null>(null);
  const stages = engineeringLoopStages({ repoId, filePath, revisionSha, pullNumber });

  async function copyBrief() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(
        engineeringAgentBrief({ repositoryId: repoId, filePath, pullNumber })
      );
      setHint('Brief copied');
      window.setTimeout(() => setHint(null), 1600);
    } catch {
      setHint('Copy failed');
      window.setTimeout(() => setHint(null), 1600);
    }
  }

  return (
    <div
      className={`ui-eng-loop${compact ? ' ui-eng-loop--compact' : ''}`}
      aria-label="Engineering loop"
    >
      <ol className="ui-eng-loop__steps">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            className={`ui-eng-loop__step${active === stage.id ? ' is-active' : ''}`}
          >
            <span className="ui-eng-loop__index" aria-hidden>
              {index + 1}
            </span>
            {stage.href ? (
              <Link className="ui-eng-loop__link" href={stage.href} title={stage.blurb}>
                {stage.label}
              </Link>
            ) : (
              <span className="ui-eng-loop__label" title={stage.blurb}>
                {stage.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="ui-diagram__action" onClick={() => void copyBrief()}>
        {hint ?? 'Copy agent brief'}
      </button>
    </div>
  );
}
