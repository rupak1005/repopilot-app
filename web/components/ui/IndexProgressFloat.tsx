import { useEffect, useRef } from 'react';
import { CheckCircle, CircleNotch, X, XCircle } from '@phosphor-icons/react';
import {
  indexProgressSteps,
  isRepoIndexInProgress,
  useAnimatedIndexProgress,
  useIndexStatus
} from '../../lib/indexStatus';
import { useIndexProgressUi, type IndexProgressJob } from '../../lib/indexProgressUi';

type IndexProgressFloatProps = IndexProgressJob;

function activeStepLabel(stage: string | undefined): string {
  const step = indexProgressSteps.find((item) => item.id === stage);
  return step?.label ?? 'Indexing repository';
}

export function IndexProgressFloat({ repoId, fullName, onReady, onFailed }: IndexProgressFloatProps) {
  const { clearIndexProgress } = useIndexProgressUi();
  const status = useIndexStatus(repoId, true, 1500);
  const failedNotified = useRef(false);
  const percent = useAnimatedIndexProgress(status);
  const indexingActive = isRepoIndexInProgress(repoId, status, repoId);
  const barPercent =
    percent ??
    (status?.state === 'indexing' ? 3 : indexingActive ? 2 : status?.state === 'ready' ? 100 : null);

  useEffect(() => {
    if (!status) return;
    if (status.state === 'ready' && status.stage === 'ready') {
      const timer = window.setTimeout(() => {
        onReady?.();
        clearIndexProgress();
      }, 800);
      return () => window.clearTimeout(timer);
    }
    if ((status.state === 'failed' || status.stage === 'failed') && !failedNotified.current) {
      failedNotified.current = true;
      onFailed?.(status.job?.lastError ?? 'Indexing failed');
    }
  }, [status, onReady, onFailed, clearIndexProgress]);

  const isFailed = status?.state === 'failed' || status?.stage === 'failed';
  const isReady = status?.state === 'ready';
  const stage = status?.stage === 'ready' || status?.stage === 'failed' ? undefined : status?.stage;
  const stepLabel = isReady
    ? fullName
    : isFailed
      ? 'Try again or check API logs'
      : status?.state === 'indexing'
        ? activeStepLabel(stage)
        : 'Starting indexer…';

  return (
    <div
      className={`index-progress-float${isFailed ? ' index-progress-float--failed' : ''}${isReady ? ' index-progress-float--ready' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="index-progress-float__head">
        <div className="index-progress-float__title-wrap">
          <p className="index-progress-float__title">
            {isReady ? 'Ready to explore' : isFailed ? 'Indexing failed' : `Indexing ${fullName}`}
          </p>
          {!isFailed && !isReady && barPercent !== null ? (
            <span className="index-progress-float__pct mono">{barPercent}%</span>
          ) : null}
        </div>
        <button
          type="button"
          className="index-progress-float__close"
          aria-label="Dismiss indexing progress"
          onClick={() => clearIndexProgress()}
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {!isFailed && !isReady && barPercent !== null ? (
        <div
          className="index-progress-float__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={barPercent}
        >
          <div
            className={`index-progress-float__bar-fill${status?.state === 'indexing' ? ' index-progress-float__bar-fill--active' : ''}`}
            style={{ width: `${barPercent}%` }}
          />
        </div>
      ) : null}

      <div className="index-progress-float__step">
        <span className="index-progress-float__icon" aria-hidden>
          {isReady ? (
            <CheckCircle size={16} weight="fill" />
          ) : isFailed ? (
            <XCircle size={16} weight="fill" />
          ) : (
            <CircleNotch size={16} weight="bold" className="index-progress-float__spinner" />
          )}
        </span>
        <span className="index-progress-float__label">{stepLabel}</span>
      </div>

      {!isFailed && !isReady && status && (status.fileCount > 0 || status.symbolCount > 0) ? (
        <p className="index-progress-float__meta mono">
          {status.fileCount > 0 ? `${status.fileCount} files` : null}
          {status.symbolCount > 0
            ? `${status.fileCount > 0 ? ' · ' : ''}${status.symbolCount} symbols`
            : null}
        </p>
      ) : null}

      {isFailed && status?.job?.lastError ? (
        <p className="index-progress-float__error">{status.job.lastError}</p>
      ) : null}
    </div>
  );
}

export function IndexProgressFloatHost() {
  const { job } = useIndexProgressUi();
  if (!job) return null;
  return <IndexProgressFloat {...job} />;
}
