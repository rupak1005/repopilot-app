export type AnalyticsEvent = {
  name: string;
  path?: string;
  properties?: Record<string, string | number | boolean | null>;
};

const CONSENT_KEY = 'repopilot.analytics.consent';

export function analyticsConsent(): 'granted' | 'denied' | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function setAnalyticsConsent(value: 'granted' | 'denied'): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(CONSENT_KEY, value);
}

export function track(event: AnalyticsEvent): void {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'false') return;
  if (typeof window === 'undefined' || analyticsConsent() !== 'granted') return;
  const payload = JSON.stringify({ ...event, path: event.path ?? window.location.pathname });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
    return;
  }
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(() => undefined);
}

export { CONSENT_KEY };
