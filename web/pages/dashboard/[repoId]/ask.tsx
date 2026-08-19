import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../../lib/dashboard';
import { Icon } from '../../../components/Icon';
import { API_BASE, type AskResponse } from '../../../lib/types';

const SUGGESTIONS = [
  'What does syncRepository do?',
  'Show architecture of auth module'
];

export default function AskPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAsk(text: string) {
    if (!repoId || !text.trim()) return;
    setLoading(true);
    setError(null);
    setLastQuery(text);
    setQuery('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/repositories/${repoId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });
      if (!response.ok) throw new Error('Ask failed — is this repo indexed?');
      setResult((await response.json()) as AskResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void runAsk(query);
  }

  return (
    <DashboardLayout activeNav="ask" canvasClass="canvas--ask">
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="ask-wrap">
        {lastQuery ? (
          <div className="ask-user-bubble">{lastQuery}</div>
        ) : null}

        {result ? (
          <div>
            <div className="confidence-row" style={{ marginBottom: 12 }}>
              <Icon name="bolt" size={20} filled />
              <span className="label-caps">RepoPilot</span>
              <span className="confidence-badge">
                <span className="pulse-dot" style={{ width: 6, height: 6 }} />
                {result.confidence} confidence
              </span>
            </div>
            <div className="answer-card">
              <p style={{ margin: 0, lineHeight: 1.6 }}>{result.answer}</p>
              {result.citations.length > 0 ? (
                <div>
                  <span className="label-caps" style={{ color: 'var(--on-surface-variant)' }}>
                    Citations & Evidence
                  </span>
                  <div className="citation-chips" style={{ marginTop: 8 }}>
                    {result.citations.map((c) => (
                      <span key={`${c.file}:${c.lines[0]}`} className="citation-chip">
                        <Icon name="description" size={14} />
                        {c.file}:{c.lines[0]}–{c.lines[1]}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : !loading && !lastQuery ? (
          <p className="empty-state">Ask anything about your codebase.</p>
        ) : null}

        {loading ? <p className="empty-state">Thinking…</p> : null}
      </div>

      <div className="ask-composer">
        <form className="ask-composer-inner" onSubmit={handleSubmit}>
          <div className="suggestion-row">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="suggestion-chip"
                onClick={() => void runAsk(s)}
              >
                <Icon name="search" size={14} />
                {s}
              </button>
            ))}
          </div>
          <div className="composer-box">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your codebase..."
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void runAsk(query);
                }
              }}
            />
            <button type="submit" className="composer-send" disabled={loading || !query.trim()}>
              <Icon name="send" size={20} filled />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
