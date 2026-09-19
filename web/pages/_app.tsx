import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { IndexProgressProvider, useIndexProgressUi } from '../lib/indexProgressUi';
import { resolveDashboardChrome } from '../lib/dashboardChrome';
import { usePageEnter, pageTransitionKey } from '../lib/motion';
import { applyTheme, getStoredTheme, hasExplicitThemePreference, syncThemeFromSystem } from '../lib/theme';
import { track } from '../lib/analytics';
import { CookieConsent } from '../components/ui/CookieConsent';
import '../styles/tokens.css';
import '../styles/neo-panels.css';
import '../styles/page-layout.css';
import '../styles/feedback.css';
import '../styles/button.css';
import '../styles/icon-button.css';
import '../styles/repo-picker.css';
import '../styles/nav-item.css';
import '../styles/shell.css';
import '../styles/status-badge.css';
import '../styles/data-table.css';
import '../styles/kpi-tile.css';
import '../styles/hotspot-list.css';
import '../styles/overview-bento.css';
import '../styles/citation-chip.css';
import '../styles/chat-bubble.css';
import '../styles/chat-composer.css';
import '../styles/search-hit.css';
import '../styles/repo-card.css';
import '../styles/login.css';
import '../styles/public-site.css';
import '../styles/landing.css';
import '../styles/browse.css';
import '../styles/demo-banner.css';
import '../styles/architecture.css';
import '../styles/viz-spike.css';
import '../styles/pr-detail.css';
import '../styles/mcp-connect.css';
import '../styles/history.css';
import '../styles/findings.css';
import '../styles/wiki.css';
import '../styles/planning.css';
import '../styles/engineering-loop.css';
import '../styles/differentiators.css';
import '../styles/index-progress-float.css';
import '../styles/docs.css';
import '../styles/globals.css';
import '../styles/focus-audit.css';

// Dashboard graphs, shell navigation, and repository data are not needed by
// public pages. Keep them in a route-level chunk so / and /browse can become
// interactive without downloading the dashboard runtime.
const DashboardLayout = dynamic(
  () => import('../lib/dashboard').then((module) => module.DashboardLayout),
  { loading: () => null }
);

const LazyIndexProgressFloat = dynamic(
  () => import('../components/ui/IndexProgressFloat').then((module) => module.IndexProgressFloat),
  { ssr: false }
);

function IndexProgressFloatSlot() {
  const { job } = useIndexProgressUi();
  return job ? <LazyIndexProgressFloat {...job} /> : null;
}

function AnimatedPage({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [routeLoading, setRouteLoading] = useState(false);
  const enter = usePageEnter();
  const chrome = resolveDashboardChrome(router.pathname);

  useEffect(() => {
    if (hasExplicitThemePreference()) {
      applyTheme(getStoredTheme());
      return;
    }

    syncThemeFromSystem();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!hasExplicitThemePreference()) syncThemeFromSystem();
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const start = () => setRouteLoading(true);
    const done = () => setRouteLoading(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    track({ name: 'page_view', path: router.asPath });
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router.asPath, router.events]);

  const page = <Component {...pageProps} />;
  // Lift shell here so sidebar nav does not remount AppShell / re-flash auth.
  const body = chrome ? (
    <DashboardLayout activeNav={chrome.activeNav} canvasClass={chrome.canvasClass}>
      {page}
    </DashboardLayout>
  ) : (
    page
  );

  return (
    <MotionConfig reducedMotion="user">
      {routeLoading ? <div className="ui-route-progress" role="status" aria-label="Loading page" /> : null}
      {chrome ? (
        body
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pageTransitionKey(router.asPath)} {...enter} style={{ minHeight: '100%' }}>
            {body}
          </motion.div>
        </AnimatePresence>
      )}
    </MotionConfig>
  );
}

export default function App(props: AppProps) {
  return (
    <IndexProgressProvider>
      <AnimatedPage {...props} />
      <CookieConsent />
      <div className="index-progress-float-host">
        <IndexProgressFloatSlot />
      </div>
    </IndexProgressProvider>
  );
}
