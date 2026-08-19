import { GlobeHemisphereWest } from '@phosphor-icons/react';
import Link from 'next/link';

export function PublicGuestBanner() {
  return (
    <div className="ui-demo-banner ui-demo-banner--public" role="status">
      <GlobeHemisphereWest size={16} weight="fill" aria-hidden />
      <span>
        Public preview — indexed from GitHub without sign-in.{' '}
        <Link href="/login">Sign in</Link> for private repos, PR reviews, and your full list.
      </span>
    </div>
  );
}
