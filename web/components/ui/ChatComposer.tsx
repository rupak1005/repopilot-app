import { type FormEvent, type KeyboardEvent, useEffect, useRef } from 'react';
import { MagnifyingGlass, PaperPlaneRight } from '@phosphor-icons/react';
import { IconButton } from './IconButton';
import { useTapMotion } from '../../lib/motion';
import { motion } from 'motion/react';

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  suggestions?: string[];
  onSuggestion?: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
};

/** Phase 6 — ask page composer with suggestion chips. */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  suggestions = [],
  onSuggestion,
  loading = false,
  placeholder = 'Ask anything about your codebase…'
}: ChatComposerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tap = useTapMotion(0.98);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--ask-composer-height',
        `${Math.ceil(node.getBoundingClientRect().height)}px`
      );
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--ask-composer-height');
    };
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div ref={rootRef} className="ui-chat-composer">
      <form className="ui-chat-composer__inner" onSubmit={handleSubmit}>
        {suggestions.length > 0 ? (
          <div className="ui-chat-composer__suggestions">
            {suggestions.map((s) => (
              <motion.button
                key={s}
                type="button"
                className="ui-chat-composer__suggestion"
                onClick={() => onSuggestion?.(s)}
                disabled={loading}
                {...tap}
              >
                <MagnifyingGlass size={13} weight="light" aria-hidden />
                {s}
              </motion.button>
            ))}
          </div>
        ) : null}
        <div className={`ui-chat-composer__box${loading ? ' ui-chat-composer__box--loading' : ''}`}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            disabled={loading}
            onKeyDown={handleKeyDown}
            aria-label="Ask a question"
          />
          <IconButton
            label="Send"
            variant="subtle"
            size="md"
            type="submit"
            disabled={loading || !value.trim()}
            className="ui-chat-composer__send"
          >
            <PaperPlaneRight size={18} weight="fill" />
          </IconButton>
        </div>
      </form>
    </div>
  );
}
