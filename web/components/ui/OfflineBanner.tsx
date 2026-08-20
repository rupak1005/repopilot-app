import { useEffect, useState } from 'react';
import { WifiSlash } from '@phosphor-icons/react';

/** Soft banner when the browser reports offline. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    }
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="ui-offline-banner" role="status" aria-live="polite">
      <WifiSlash size={16} weight="bold" aria-hidden />
      <span>You’re offline — some actions won’t work until the connection returns.</span>
    </div>
  );
}
