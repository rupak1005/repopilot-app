import { Head, Html, Main, NextScript } from 'next/document';
import { THEME_INIT_SCRIPT } from '../lib/theme';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#f3e8ff" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/style.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
