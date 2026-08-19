import Link from 'next/link';
import { useRouter } from 'next/router';
import { CaretDown, GitBranch, GithubLogo, List } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { GITHUB_SIGN_IN_URL } from '../../lib/auth';
import { splitRepoFullName } from './repoPickerUtils';

type RepoOption = {
  id: string;
  fullName: string;
};

type RepoPickerProps = {
  repoId: string;
  repoFullName: string;
  isPublicGuest?: boolean;
};

export function RepoPicker({ repoId, repoFullName, isPublicGuest = false }: RepoPickerProps) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const { owner, name } = splitRepoFullName(repoFullName);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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

  useEffect(() => {
    if (!open || isPublicGuest) return;
    let cancelled = false;

    async function loadRepos() {
      setLoadingRepos(true);
      try {
        const response = await fetch('/api/repos');
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as RepoOption[];
        if (!cancelled) setRepos(data);
      } catch {
        // ponytail: dropdown still works with current repo + show all
      } finally {
        if (!cancelled) setLoadingRepos(false);
      }
    }

    void loadRepos();
    return () => {
      cancelled = true;
    };
  }, [open, isPublicGuest]);

  async function switchRepo(nextId: string, fullName: string) {
    setOpen(false);
    if (nextId === repoId) return;

    await fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName })
    });

    const nextPath = router.asPath.replace(`/dashboard/${repoId}`, `/dashboard/${nextId}`);
    void router.push(nextPath.startsWith('/dashboard/') ? nextPath : `/dashboard/${nextId}`);
  }

  const quickRepos = repos.filter((repo) => repo.id !== repoId).slice(0, 8);

  return (
    <div className="ui-repo-picker-wrap" ref={rootRef}>
      <button
        type="button"
        className="ui-repo-picker"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ui-repo-picker__glyph" aria-hidden>
          <GitBranch size={14} weight="light" />
        </span>
        <span className="ui-repo-picker__label">
          {owner ? (
            <>
              <span className="ui-repo-picker__owner">{owner}</span>
              <span className="ui-repo-picker__sep">/</span>
            </>
          ) : null}
          <span className="ui-repo-picker__name">{name || repoFullName}</span>
        </span>
        <span className="ui-repo-picker__caret" aria-hidden>
          <CaretDown size={12} weight="light" />
        </span>
      </button>

      {open ? (
        <div id={menuId} className="ui-repo-picker-menu" role="menu" aria-label="Repositories">
          <div className="ui-repo-picker-menu__current" role="presentation">
            <span className="ui-repo-picker-menu__label">Current</span>
            <span className="ui-repo-picker-menu__repo mono">{repoFullName}</span>
          </div>

          {isPublicGuest ? (
            <p className="ui-repo-picker-menu__hint">
              <Link href={GITHUB_SIGN_IN_URL} className="ui-repo-picker-menu__signin" role="menuitem">
                <GithubLogo size={16} weight="fill" aria-hidden />
                Connect GitHub
              </Link>{' '}
              to switch between your repositories.
            </p>
          ) : loadingRepos ? (
            <p className="ui-repo-picker-menu__hint">Loading repositories…</p>
          ) : quickRepos.length > 0 ? (
            <ul className="ui-repo-picker-menu__list">
              {quickRepos.map((repo) => (
                <li key={repo.id}>
                  <button
                    type="button"
                    className="ui-repo-picker-menu__item"
                    role="menuitem"
                    onClick={() => void switchRepo(repo.id, repo.fullName)}
                  >
                    {repo.fullName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="ui-repo-picker-menu__footer">
            <Link href="/repos" className="ui-repo-picker-menu__all" role="menuitem" onClick={() => setOpen(false)}>
              <List size={16} weight="bold" aria-hidden />
              Show all repositories
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
