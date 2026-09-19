import Link from 'next/link';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';

export default function ServerErrorPage() {
  return (
    <PublicPageLayout
      active="home"
      pageClassName="landing-page"
      mainClassName="landing-page__main"
      shellClassName="landing-shell"
      seo={{
        title: 'Something went wrong',
        description: 'RepoPilot could not complete that request.',
        path: '/500',
        noIndex: true
      }}
    >
      <div className="landing-card">
        <p className="landing-eyebrow">500</p>
        <h1>That request hit a snag.</h1>
        <p className="landing-lede">Try again, or return to the home page and start a fresh analysis.</p>
        <p className="landing-footer">
          <Link href="/">Back to home</Link>
          <span aria-hidden> · </span>
          <Link href="/contact">Contact support</Link>
        </p>
      </div>
    </PublicPageLayout>
  );
}
