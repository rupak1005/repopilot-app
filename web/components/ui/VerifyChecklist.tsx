import { useEffect, useMemo, useState } from 'react';
import type { ImpactTestPlan } from '@repopilot/common';
import {
  loadVerifyChecked,
  saveVerifyChecked,
  verifyItemsFromTestPlan,
  verifyProgress,
  verifyStorageKey
} from '../../lib/verifyChecklist';

type VerifyChecklistProps = {
  repoId: string;
  /** Storage scope, e.g. `pull:42` or `file:api/src/x.ts`. */
  scope: string;
  testPlan?: ImpactTestPlan | null;
  title?: string;
};

export function VerifyChecklist({
  repoId,
  scope,
  testPlan,
  title = 'Verify (local tests)'
}: VerifyChecklistProps) {
  const storageKey = verifyStorageKey(repoId, scope);
  const items = useMemo(() => verifyItemsFromTestPlan(testPlan), [testPlan]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    setChecked(loadVerifyChecked(storageKey));
  }, [storageKey]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveVerifyChecked(storageKey, next);
      return next;
    });
  }

  async function copyCommand(command: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopyHint('Copied');
      window.setTimeout(() => setCopyHint(null), 1400);
    } catch {
      setCopyHint('Copy failed');
      window.setTimeout(() => setCopyHint(null), 1400);
    }
  }

  if (items.length === 0) {
    return (
      <div className="ui-verify-checklist">
        <p className="label-caps">{title}</p>
        <p className="ui-finding-card__desc">
          No classified test commands yet — open Impact for this change to build a testPlan.
        </p>
      </div>
    );
  }

  const progress = verifyProgress(items, checked);

  return (
    <div className="ui-verify-checklist" aria-label={title}>
      <div className="ui-verify-checklist__head">
        <p className="label-caps">{title}</p>
        <p className="ui-verify-checklist__progress mono">
          {progress.done}/{progress.total}
          {progress.complete ? ' · done' : ''}
          {copyHint ? ` · ${copyHint}` : ''}
        </p>
      </div>
      <ul className="ui-verify-checklist__list">
        {items.map((item) => (
          <li key={item.id} className="ui-verify-checklist__item">
            <label className="ui-verify-checklist__label">
              <input
                type="checkbox"
                checked={Boolean(checked[item.id])}
                onChange={() => toggle(item.id)}
              />
              <span>
                <span className="ui-verify-checklist__title">{item.label}</span>
                {item.detail ? (
                  <span className="ui-verify-checklist__detail mono">{item.detail}</span>
                ) : null}
              </span>
            </label>
            {item.command ? (
              <button
                type="button"
                className="ui-diagram__action"
                onClick={() => void copyCommand(item.command!)}
              >
                Copy
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="ui-verify-checklist__note">
        Tick after you run each command locally — RepoPilot does not execute tests.
      </p>
    </div>
  );
}
