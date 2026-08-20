import { useEffect, useRef } from 'react';
import { CheckCircle, CircleNotch, XCircle } from '@phosphor-icons/react';
import {
  indexProgressPercent,
  indexProgressSteps,
  type IndexStage,
  type RepositoryIndexStatus,
  useAnimatedIndexProgress,
  useIndexStatus
} from '../../lib/indexStatus';

type IndexProgressProps = {
  repoId: string;
  fullName?: string;
  onReady?: () => void;
  onFailed?: (message: string) => void;
};

function stepState(
  step: Exclude<IndexStage, 'failed'>,
  status: RepositoryIndexStatus
): 'done' | 'active' | 'pending' | 'failed' {
  const order = indexProgressSteps.map((s) => s.id);
  const stepIdx = order.indexOf(step);

  if (status.stage === 'ready') return 'done';

  if (status.stage === 'failed') {
    const failedStep: Exclude<IndexStage, 'failed'> =
      status.fileCount === 0
        ? 'clone'
        : status.symbolCount === 0
          ? 'parse'
          : (status.moduleDependencyCount ?? 0) === 0
            ? 'graph'
            : 'history';
    if (stepIdx < order.indexOf(failedStep)) return 'done';
    if (step === failedStep) return 'failed';
    return 'pending';
  }

  const currentIdx = order.indexOf(status.stage as Exclude<IndexStage, 'failed'>);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export function IndexProgress({ repoId, fullName, onReady, onFailed }: IndexProgressProps) {
  const status = useIndexStatus(repoId, true, 1500);
  const failedNotified = useRef(false);

  useEffect(() => {
    if (!status) return;
    if (status.state === 'ready' && status.stage === 'ready') {
      const timer = window.setTimeout(() => onReady?.(), 600);
      return () => window.clearTimeout(timer);
    }
    if ((status.state === 'failed' || status.stage === 'failed') && !failedNotified.current) {
      failedNotified.current = true;
      onFailed?.(status.job?.lastError ?? 'Indexing failed');
    }
  }, [status, onReady, onFailed]);

  const percent = useAnimatedIndexProgress(status);
  const barPercent =
    percent ?? (status?.state === 'indexing' ? 3 : status?.state === 'ready' ? 100 : null);
  const showBar = barPercent !== null;

  return (
    <div className="index-progress" role="status" aria-live="polite">
      <div className="index-progress__head">
        <p className="index-progress__title">
          {fullName ? `Indexing ${fullName}` : 'Indexing repository'}
          {percent !== null ? (
            <span className="index-progress__pct mono">{percent}%</span>
          ) : status?.state === 'indexing' ? (
            <span className="index-progress__pct mono">…</span>
          ) : null}
        </p>
        {showBar ? (
          <div
            className="index-progress__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={barPercent}
            aria-label="Indexing progress"
          >
            <div
              className={`index-progress__bar-fill${status?.state === 'indexing' ? ' index-progress__bar-fill--active' : ''}`}
              style={{ width: `${barPercent}%` }}
            />
          </div>
        ) : null}
      </div>
      <ol className="index-progress__steps">
        {indexProgressSteps.map((step) => {
          const state = status ? stepState(step.id, status) : 'pending';
          return (
            <li
              key={step.id}
              className={`index-progress__step index-progress__step--${state}`}
            >
              <span className="index-progress__icon" aria-hidden>
                {state === 'done' ? (
                  <CheckCircle size={18} weight="fill" />
                ) : state === 'active' ? (
                  <CircleNotch size={18} weight="bold" className="index-progress__spinner" />
                ) : state === 'failed' ? (
                  <XCircle size={18} weight="fill" />
                ) : (
                  <span className="index-progress__dot" />
                )}
              </span>
              <span className="index-progress__label">{step.label}</span>
              {state === 'active' && status ? (
                <span className="index-progress__meta mono">
                  {status.fileCount > 0 ? `${status.fileCount} files` : null}
                  {status.symbolCount > 0
                    ? `${status.fileCount > 0 ? ' · ' : ''}${status.symbolCount} symbols`
                    : null}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {status?.state === 'failed' && status.job?.lastError ? (
        <p className="index-progress__error">{status.job.lastError}</p>
      ) : null}
    </div>
  );
}
