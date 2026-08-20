import type { ReactNode } from 'react';
import { MAIN_CONTENT_ID } from '../../lib/a11y';
import { LandingDecor } from './LandingDecor';
import { PublicSiteHeader } from './PublicSiteHeader';
import { SeoHead, type SeoHeadProps } from './SeoHead';
import { SkipLink } from './SkipLink';

type PublicPageLayoutProps = {
  active?: 'home' | 'browse' | 'docs' | 'login' | 'repos';
  pageClassName: string;
  mainClassName: string;
  shellClassName?: string;
  decorVariant?: 'full' | 'top';
  seo: SeoHeadProps;
  children: ReactNode;
};

export function PublicPageLayout({
  active,
  pageClassName,
  mainClassName,
  shellClassName,
  decorVariant = 'full',
  seo,
  children
}: PublicPageLayoutProps) {
  const shellClass = ['public-page-shell', shellClassName].filter(Boolean).join(' ');

  return (
    <div className={pageClassName}>
      <SeoHead {...seo} />
      <SkipLink />
      <PublicSiteHeader active={active} />
      <main id={MAIN_CONTENT_ID} className={mainClassName} tabIndex={-1}>
        <div className={shellClass}>
          <LandingDecor variant={decorVariant} />
          {children}
        </div>
      </main>
    </div>
  );
}
