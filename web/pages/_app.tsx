import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/tokens.css';
import '../styles/button.css';
import '../styles/icon-button.css';
import '../styles/repo-picker.css';
import '../styles/login.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/style.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
