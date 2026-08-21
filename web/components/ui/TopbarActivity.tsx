import Link from 'next/link';
import { Bell, X } from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  activityUnreadCount,
  buildActivityItems,
  seenReadyStorageKey,
  type ActivityItem
} from '../../lib/shellChrome';
import type { RepositoryIndexStatus } from '../../lib/indexStatus';
import { IconButton } from './IconButton';

type TopbarActivityProps = {
  repoId: string;
  repoFullName: string;
  indexStatus: RepositoryIndexStatus | null;
  className?: string;
};

function readSeenReady(repoId: string): string | null {
  try {
    return window.sessionStorage.getItem(seenReadyStorageKey(repoId));
  } catch {
    return null;
  }
}

function writeSeenReady(repoId: string, sha: string) {
  try {
    window.sessionStorage.setItem(seenReadyStorageKey(repoId), sha);
  } catch {
    // ignore quota / private mode
  }
}

export function TopbarActivity({ repoId, repoFullName, indexStatus, className }: TopbarActivityProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [seenReadySha, setSeenReadySha] = useState<string | null>(null);

  useEffect(() => {
    setSeenReadySha(readSeenReady(repoId));
  }, [repoId]);

  const items = useMemo(
    () =>
      buildActivityItems({
        repoId,
        repoFullName,
        indexStatus,
        seenReadySha
      }),
    [repoId, repoFullName, indexStatus, seenReadySha]
  );
  const unread = activityUnreadCount(items);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function markReadySeen() {
    const sha = indexStatus?.state === 'ready' ? indexStatus.revisionSha : null;
    if (!sha) return;
    writeSeenReady(repoId, sha);
    setSeenReadySha(sha);
  }

  function handleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) markReadySeen();
      return next;
    });
  }

  return (
    <div className={['topbar-popover', className].filter(Boolean).join(' ')} ref={rootRef}>
      <IconButton
        label={unread > 0 ? `Activity, ${unread} unread` : 'Activity'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleOpen}
      >
        <Bell size={18} weight="light" />
        {unread > 0 ? <span className="topbar-popover__badge" aria-hidden /> : null}
      </IconButton>
      {open ? (
        <div id={panelId} className="topbar-popover__panel" role="dialog" aria-label="Activity">
          <div className="topbar-popover__head">
            <p className="topbar-popover__eyebrow label-caps">Activity</p>
            <button
              type="button"
              className="topbar-popover__close"
              aria-label="Close activity"
              onClick={() => setOpen(false)}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
          <ul className="topbar-activity">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} onNavigate={() => setOpen(false)} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ActivityRow({ item, onNavigate }: { item: ActivityItem; onNavigate: () => void }) {
  const content = (
    <>
      <span className={`topbar-activity__kind topbar-activity__kind--${item.kind}`} aria-hidden />
      <span className="topbar-activity__text">
        <span className="topbar-activity__title">
          {item.title}
          {item.unread ? <span className="topbar-activity__dot" aria-label="Unread" /> : null}
        </span>
        <span className="topbar-activity__body">{item.body}</span>
      </span>
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className="topbar-activity__item" onClick={onNavigate}>
          {content}
        </Link>
      </li>
    );
  }

  return <li className="topbar-activity__item topbar-activity__item--static">{content}</li>;
}
