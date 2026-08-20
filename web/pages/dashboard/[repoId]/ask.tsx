import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../../../components/ui/Button';
import { ChatBubble } from '../../../components/ui/ChatBubble';
import { ChatComposer } from '../../../components/ui/ChatComposer';
import { CitationChip } from '../../../components/ui/CitationChip';
import { Dialog } from '../../../components/ui/Dialog';
import { ThinkingBubble } from '../../../components/ui/ThinkingBubble';
import { useToast } from '../../../components/ui/ToastProvider';
import {
  clearAskThread,
  createAskMessageId,
  loadAskThread,
  saveAskThread,
  type AskMessage
} from '../../../lib/askThread';
import { demoAskResponse, demoDelay } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';
import { repoApiPath } from '../../../lib/serverApi';
import { DashboardLayout, useDashboardContext } from '../../../lib/dashboard';
import { type AskResponse } from '../../../lib/types';

const SUGGESTIONS = [
  'What does syncRepository do?',
  'Show architecture of auth module'
];

function AssistantContent({
  response,
  repoId,
  repoFullName
}: {
  response: AskResponse;
  repoId: string;
  repoFullName?: string;
}) {
  return (
    <>
      <p style={{ margin: 0 }}>{response.answer}</p>
      {response.citations.length > 0 ? (
        <div className="ui-chat-bubble__citations">
          <span className="ui-chat-bubble__citations-label label-caps">Citations & Evidence</span>
          <div className="ui-chat-bubble__citation-row">
            {response.citations.map((c) => (
              <CitationChip
                key={`${c.file}:${c.lines[0]}`}
                file={c.file}
                lines={c.lines}
                repoId={repoId}
                repoFullName={repoFullName}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function AskPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!repoId) return;
    setMessages(loadAskThread(repoId));
    setHydrated(true);
  }, [repoId]);

  useEffect(() => {
    const seeded = typeof router.query.q === 'string' ? router.query.q.trim() : '';
    if (seeded) setQuery(seeded);
  }, [router.query.q]);

  useEffect(() => {
    if (!repoId || !hydrated) return;
    saveAskThread(repoId, messages);
  }, [repoId, messages, hydrated]);

  useEffect(() => {
    const anchor = threadEndRef.current;
    if (!anchor) return;

    const scrollToBottom = () => {
      const canvas = anchor.closest('.canvas');
      if (canvas instanceof HTMLElement) {
        canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'smooth' });
        return;
      }
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    const frame = requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));
    const timer = window.setTimeout(scrollToBottom, 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [messages, loading]);

  async function runAsk(text: string) {
    if (!repoId || !text.trim() || loading) return;
    const trimmed = text.trim();
    setMessages((prev) => [...prev, { id: createAskMessageId(), role: 'user', text: trimmed }]);
    setQuery('');
    setLoading(true);

    try {
      let response: AskResponse;
      if (isDemoMode()) {
        await demoDelay();
        response = demoAskResponse(trimmed);
      } else {
        const res = await fetch(repoApiPath(repoId, 'ask'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed })
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(
            body?.error ??
              'Ask failed — index the repo first (./scripts/index-repo.sh owner/repo) or enable demo mode.'
          );
        }
        response = (await res.json()) as AskResponse;
      }

      setMessages((prev) => [
        ...prev,
        { id: createAskMessageId(), role: 'assistant', response }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: createAskMessageId(),
          role: 'error',
          text: err instanceof Error ? err.message : 'Ask failed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    void runAsk(query);
  }

  function handleClearHistory() {
    if (!repoId) return;
    clearAskThread(repoId);
    setMessages([]);
    setConfirmClearOpen(false);
    toast('Chat history cleared', { variant: 'success' });
  }

  const hasHistory = messages.length > 0;

  return (
    <DashboardLayout activeNav="ask" canvasClass="canvas--ask">
      <div className="ui-ask-page">
        {!hasHistory && !loading ? (
          <header className="ui-ask-hero">
            <h1>Ask RepoPilot</h1>
            <p>Grounded answers with file citations from your indexed codebase.</p>
          </header>
        ) : (
          <div className="ui-ask-toolbar">
            <span className="ui-ask-toolbar__count">
              {messages.filter((m) => m.role === 'user').length} question
              {messages.filter((m) => m.role === 'user').length === 1 ? '' : 's'}
            </span>
            <button type="button" className="ui-ask-toolbar__clear" onClick={() => setConfirmClearOpen(true)}>
              Clear history
            </button>
          </div>
        )}

        <div className="ui-ask-thread">
          {!hasHistory && !loading ? (
            <p className="empty-state ui-ask-hint">
              {isDemoMode()
                ? 'Pick a suggestion below or type your own question.'
                : 'Index first with ./scripts/index-repo.sh owner/repo, or enable NEXT_PUBLIC_DEMO_MODE=true.'}
            </p>
          ) : null}

          {messages.map((message) => {
            if (message.role === 'user') {
              return (
                <ChatBubble key={message.id} role="user">
                  {message.text}
                </ChatBubble>
              );
            }
            if (message.role === 'error') {
              return (
                <div key={message.id} className="ui-chat-error">
                  {message.text}
                </div>
              );
            }
            return (
              <ChatBubble
                key={message.id}
                role="assistant"
                meta={
                  <span className="ui-confidence-badge">
                    <span className="ui-confidence-badge__dot" />
                    {message.response.confidence} confidence
                  </span>
                }
              >
                <AssistantContent
                  response={message.response}
                  repoId={repoId!}
                  repoFullName={repoFullName}
                />
              </ChatBubble>
            );
          })}

          {loading ? <ThinkingBubble label="Searching codebase and drafting answer" /> : null}
          <div ref={threadEndRef} className="ui-ask-thread__anchor" aria-hidden />
        </div>
      </div>

      <ChatComposer
        value={query}
        onChange={setQuery}
        onSubmit={() => handleSubmit()}
        suggestions={hasHistory ? [] : SUGGESTIONS}
        onSuggestion={(s) => void runAsk(s)}
        loading={loading}
      />

      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear chat history?"
        description="This removes all messages for this repository from this browser session."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClearHistory}>
              Clear
            </Button>
          </>
        }
      />
    </DashboardLayout>
  );
}
