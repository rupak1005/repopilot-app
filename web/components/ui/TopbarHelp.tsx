import Link from 'next/link';
import { Question } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import type { NavKey } from '../../lib/shellChrome';
import { helpTipForNav } from '../../lib/shellChrome';
import { IconButton } from './IconButton';

type TopbarHelpProps = {
  activeNav: NavKey;
  className?: string;
};

export function TopbarHelp({ activeNav, className }: TopbarHelpProps) {
  const tip = helpTipForNav(activeNav);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <div className={['topbar-popover', className].filter(Boolean).join(' ')} ref={rootRef}>
      <IconButton
        label="Help for this page"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Question size={18} weight="light" />
      </IconButton>
      {open ? (
        <div id={panelId} className="topbar-popover__panel" role="dialog" aria-label="Help">
          <p className="topbar-popover__eyebrow label-caps">This page</p>
          <h2 className="topbar-popover__title">{tip.title}</h2>
          <p className="topbar-popover__body">{tip.body}</p>
          <div className="topbar-popover__links">
            <Link href={tip.docHref} className="topbar-popover__link" onClick={() => setOpen(false)}>
              {tip.docLabel}
            </Link>
            {tip.secondaryHref && tip.secondaryLabel ? (
              <Link
                href={tip.secondaryHref}
                className="topbar-popover__link topbar-popover__link--muted"
                onClick={() => setOpen(false)}
              >
                {tip.secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
