import Link from 'next/link';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';

export default function NotFoundPage() {
  return (
    <PublicPageLayout
      active="home"
      pageClassName="landing-page"
      mainClassName="landing-page__main"
      shellClassName="landing-shell"
      seo={{
        title: 'Page not found',
        description: 'This RepoPilot page does not exist.',
        path: '/404',
        noIndex: true
      }}
    >
      <div className="landing-card">
        <p className="landing-eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="landing-lede">That URL is not a RepoPilot page. Head home to analyze a repository.</p>
        <p className="landing-footer">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </PublicPageLayout>
  );
}
