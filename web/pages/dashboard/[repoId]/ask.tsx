import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../../lib/dashboard';
import { API_BASE, type AskResponse } from '../../../lib/types';

export default function AskPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoId || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/repositories/${repoId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!response.ok) throw new Error('Ask failed — is this repo indexed?');
      setResult((await response.json()) as AskResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Ask RepoPilot" subtitle="Natural-language Q&A with citations.">
      {error ? <div className="error-banner">{error}</div> : null}
      <section className="card">
        <form onSubmit={handleSubmit} className="form-row">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What does syncRepository do?"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '…' : 'Ask'}
          </button>
        </form>
        {result ? (
          <div className="answer-box">
            <span className="badge badge-accent">{result.confidence} confidence</span>
            <p style={{ marginTop: 12 }}>{result.answer}</p>
            {result.citations.length > 0 ? (
              <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 13, color: 'var(--text-muted)' }}>
                {result.citations.map((c) => (
                  <li key={`${c.file}:${c.lines[0]}`}>
                    {c.file}:{c.lines[0]}–{c.lines[1]}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="empty-state" style={{ marginTop: 16 }}>
            Ask a question about this codebase.
          </p>
        )}
      </section>
    </DashboardLayout>
  );
}
