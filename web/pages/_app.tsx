import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ToastProvider } from '../components/ui/ToastProvider';
import { usePageEnter } from '../lib/motion';
import { applyTheme, getStoredTheme } from '../lib/theme';
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
import '../styles/differentiators.css';
import '../styles/globals.css';
import '../styles/focus-audit.css';

function AnimatedPage({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const enter = usePageEnter();

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div key={router.asPath} {...enter} style={{ minHeight: '100%' }}>
          <Component {...pageProps} />
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

export default function App(props: AppProps) {
  return (
    <ToastProvider>
      <AnimatedPage {...props} />
    </ToastProvider>
  );
}
