import { useEffect, useState } from 'react';
import Link from 'next/link';
import { analyticsConsent, setAnalyticsConsent } from '../../lib/analytics';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(analyticsConsent() === null);
  }, []);

  if (!visible) return null;

  function choose(value: 'granted' | 'denied') {
    setAnalyticsConsent(value);
    setVisible(false);
  }

  return (
    <aside className="ui-cookie-consent" aria-label="Privacy choices">
      <div>
        <strong>Privacy choices</strong>
        <p>
          RepoPilot uses optional anonymous product analytics to improve navigation and conversion flows. You can
          accept or decline; essential session cookies work either way.
        </p>
        <Link href="/privacy">Read the privacy policy</Link>
      </div>
      <div className="ui-cookie-consent__actions">
        <button type="button" className="ui-cookie-consent__button ui-cookie-consent__button--quiet" onClick={() => choose('denied')}>
          Decline
        </button>
        <button type="button" className="ui-cookie-consent__button" onClick={() => choose('granted')}>
          Allow analytics
        </button>
      </div>
    </aside>
  );
}
