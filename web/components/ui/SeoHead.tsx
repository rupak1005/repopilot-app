import Head from 'next/head';
import { DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl } from '../../lib/seo';

export type SeoHeadProps = {
  title: string;
  description?: string;
  path: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
};

export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noIndex = false,
  jsonLd
}: SeoHeadProps) {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
  const url = absoluteUrl(path);
  const robots = noIndex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta key="description" name="description" content={description} />
      <meta key="robots" name="robots" content={robots} />
      <link key="canonical" rel="canonical" href={url} />
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:title" property="og:title" content={fullTitle} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="twitter:card" name="twitter:card" content="summary" />
      <meta key="twitter:title" name="twitter:title" content={fullTitle} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
    </Head>
  );
}
