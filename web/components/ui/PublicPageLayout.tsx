import type { ReactNode } from 'react';
import { LandingDecor } from './LandingDecor';
import { PublicSiteHeader } from './PublicSiteHeader';

type PublicPageLayoutProps = {
  active?: 'home' | 'browse' | 'docs' | 'login' | 'repos';
  pageClassName: string;
  mainClassName: string;
  shellClassName?: string;
  decorVariant?: 'full' | 'top';
  children: ReactNode;
};

export function PublicPageLayout({
  active,
  pageClassName,
  mainClassName,
  shellClassName,
  decorVariant = 'full',
  children
}: PublicPageLayoutProps) {
  const shellClass = ['public-page-shell', shellClassName].filter(Boolean).join(' ');

  return (
    <div className={pageClassName}>
      <PublicSiteHeader active={active} />
      <main className={mainClassName}>
        <div className={shellClass}>
          <LandingDecor variant={decorVariant} />
          {children}
        </div>
      </main>
    </div>
  );
}
