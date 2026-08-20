import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { firstFocusable, trapFocus } from '../../lib/a11y';
import {
  COMMAND_ICONS,
  dashboardCommands,
  filterCommands,
  type CommandDef
} from '../../lib/shellNav';

type CommandPaletteProps = {
  repoId: string;
};

export function CommandPalette({ repoId }: CommandPaletteProps) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const commands = useMemo(() => dashboardCommands(repoId), [repoId]);
  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (dialogRef.current) trapFocus(dialogRef.current, event);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('rp:open-command-palette', onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('rp:open-command-palette', onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = window.setTimeout(() => {
      (inputRef.current ?? firstFocusable(dialogRef.current))?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runCommand(cmd: CommandDef) {
    setOpen(false);
    void router.push(cmd.path);
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) runCommand(cmd);
    }
  }

  if (!open) return null;

  return (
    <div className="command-palette" role="presentation">
      <button
        type="button"
        className="command-palette__backdrop"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div
        ref={dialogRef}
        className="command-palette__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="command-palette__search">
          <MagnifyingGlass size={18} weight="bold" aria-hidden />
          <input
            ref={inputRef}
            className="command-palette__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search commands…"
            aria-controls={listId}
            aria-autocomplete="list"
          />
          <kbd className="command-palette__kbd">esc</kbd>
        </div>
        <ul id={listId} className="command-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <li className="command-palette__empty">No matching commands</li>
          ) : (
            filtered.map((cmd, index) => {
              const Icon = COMMAND_ICONS[cmd.id];
              const active = index === activeIndex;
              return (
                <li key={cmd.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`command-palette__item${active ? ' command-palette__item--active' : ''}`}
                    onClick={() => runCommand(cmd)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {Icon ? (
                      <span className="command-palette__icon" aria-hidden>
                        <Icon size={16} weight="bold" />
                      </span>
                    ) : null}
                    <span className="command-palette__label">{cmd.label}</span>
                    {cmd.hint ? <span className="command-palette__hint">{cmd.hint}</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <p className="command-palette__footer label-caps">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>⌘K toggle</span>
        </p>
      </div>
    </div>
  );
}
