import { GlobeHemisphereWest } from '@phosphor-icons/react';
import Link from 'next/link';

import { GITHUB_SIGN_IN_URL } from '../../lib/auth';

export function PublicGuestBanner() {
  return (
    <div className="ui-demo-banner ui-demo-banner--public" role="status">
      <GlobeHemisphereWest size={16} weight="fill" aria-hidden />
      <span>
        Public preview — real AST indexing, not AI diagram guesses. Explore impact, hotspots, Ask,
        and PR review below, or{' '}
        <Link href={GITHUB_SIGN_IN_URL}>connect GitHub</Link> for private repos and your full
        repository list.
      </span>
    </div>
  );
}
