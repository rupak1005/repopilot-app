import Link from 'next/link';
import type { ReactNode } from 'react';
import { DEFAULT_DESCRIPTION } from '../../lib/seo';
import { DOCS_NAV, docHref, type DocSlug } from '../../lib/docsNav';
import { PublicSiteHeader } from './PublicSiteHeader';
import { SeoHead } from './SeoHead';

type DocsLayoutProps = {
  slug: DocSlug;
  title: string;
  lede?: string;
  children: ReactNode;
};

export function DocsLayout({ slug, title, lede, children }: DocsLayoutProps) {
  return (
    <div className="docs-page">
      <SeoHead
        title={title}
        description={lede ?? DEFAULT_DESCRIPTION}
        path={docHref(slug)}
      />
      <PublicSiteHeader active="docs" />
      <div className="docs-page__frame">
        <aside className="docs-sidebar" aria-label="Documentation">
          <p className="docs-sidebar__label">Documentation</p>
          <nav className="docs-sidebar__nav">
            {DOCS_NAV.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                className={`docs-sidebar__link${item.slug === slug ? ' docs-sidebar__link--active' : ''}`}
              >
                <span className="docs-sidebar__link-title">{item.title}</span>
                <span className="docs-sidebar__link-summary">{item.summary}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <article className="docs-main">
          <header className="docs-main__header">
            <h1>{title}</h1>
            {lede ? <p className="docs-main__lede">{lede}</p> : null}
          </header>
          <div className="docs-prose">{children}</div>
        </article>
      </div>
    </div>
  );
}

export function DocsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="docs-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function DocsCode({ children }: { children: string }) {
  return <pre className="docs-code"><code>{children}</code></pre>;
}

export function DocsTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
