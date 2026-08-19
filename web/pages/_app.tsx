import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { usePageEnter } from '../lib/motion';
import '../styles/tokens.css';
import '../styles/button.css';
import '../styles/icon-button.css';
import '../styles/repo-picker.css';
import '../styles/nav-item.css';
import '../styles/shell.css';
import '../styles/status-badge.css';
import '../styles/data-table.css';
import '../styles/kpi-tile.css';
import '../styles/overview-bento.css';
import '../styles/citation-chip.css';
import '../styles/chat-bubble.css';
import '../styles/chat-composer.css';
import '../styles/search-hit.css';
import '../styles/repo-card.css';
import '../styles/login.css';
import '../styles/globals.css';
import '../styles/focus-audit.css';

function AnimatedPage({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const enter = usePageEnter();

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
  return <AnimatedPage {...props} />;
}
