import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ToastProvider } from '../components/ui/ToastProvider';
import { IndexProgressFloatHost } from '../components/ui/IndexProgressFloat';
import { IndexProgressProvider } from '../lib/indexProgressUi';
import { DashboardLayout } from '../lib/dashboard';
import { resolveDashboardChrome } from '../lib/dashboardChrome';
import { usePageEnter, pageTransitionKey } from '../lib/motion';
import { applyTheme, getStoredTheme, hasExplicitThemePreference, syncThemeFromSystem } from '../lib/theme';
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
import '../styles/pr-detail.css';
import '../styles/mcp-connect.css';
import '../styles/history.css';
import '../styles/findings.css';
import '../styles/wiki.css';
import '../styles/planning.css';
import '../styles/differentiators.css';
import '../styles/index-progress-float.css';
import '../styles/docs.css';
import '../styles/globals.css';
import '../styles/focus-audit.css';

function AnimatedPage({ Component, pageProps }: AppProps) {
  const router = useRouter();
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
      {chrome ? (
        body
      ) : (
        <AnimatePresence mode="wait">
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
      <ToastProvider>
        <AnimatedPage {...props} />
        <div className="index-progress-float-host">
          <IndexProgressFloatHost />
        </div>
      </ToastProvider>
    </IndexProgressProvider>
  );
}
