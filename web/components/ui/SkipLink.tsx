import { MAIN_CONTENT_ID } from '../../lib/a11y';

/** First-focus control that jumps past chrome into primary content. */
export function SkipLink({ href = `#${MAIN_CONTENT_ID}` }: { href?: string }) {
  return (
    <a className="skip-link" href={href}>
      Skip to main content
    </a>
  );
}
