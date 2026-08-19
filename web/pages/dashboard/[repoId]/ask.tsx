import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../../lib/dashboard';
import { ChatBubble } from '../../../components/ui/ChatBubble';
import { ChatComposer } from '../../../components/ui/ChatComposer';
import { CitationChip } from '../../../components/ui/CitationChip';
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

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    void runAsk(query);
  }

  return (
    <DashboardLayout activeNav="ask" canvasClass="canvas--ask">
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="ui-ask-thread">
        {lastQuery ? <ChatBubble role="user">{lastQuery}</ChatBubble> : null}

        {result ? (
          <ChatBubble
            role="assistant"
            meta={
              <span className="ui-confidence-badge">
                <span className="ui-confidence-badge__dot" />
                {result.confidence} confidence
              </span>
            }
          >
            <p style={{ margin: 0 }}>{result.answer}</p>
            {result.citations.length > 0 ? (
              <div className="ui-chat-bubble__citations">
                <span className="ui-chat-bubble__citations-label label-caps">
                  Citations & Evidence
                </span>
                <div className="ui-chat-bubble__citation-row">
                  {result.citations.map((c) => (
                    <CitationChip key={`${c.file}:${c.lines[0]}`} file={c.file} lines={c.lines} />
                  ))}
                </div>
              </div>
            ) : null}
          </ChatBubble>
        ) : !loading && !lastQuery ? (
          <p className="empty-state">Ask anything about your codebase.</p>
        ) : null}

        {loading ? <p className="empty-state">Thinking…</p> : null}
      </div>

      <ChatComposer
        value={query}
        onChange={setQuery}
        onSubmit={() => handleSubmit()}
        suggestions={SUGGESTIONS}
        onSuggestion={(s) => void runAsk(s)}
        loading={loading}
      />
    </DashboardLayout>
  );
}
