import type { ReactNode } from 'react';
import { Lightning } from '@phosphor-icons/react';

type ChatBubbleProps = {
  role: 'user' | 'assistant';
  children: ReactNode;
  meta?: ReactNode;
};

/** Phase 6 — chat message bubble. */
export function ChatBubble({ role, children, meta }: ChatBubbleProps) {
  if (role === 'user') {
    return <div className="ui-chat-bubble ui-chat-bubble--user">{children}</div>;
  }

  return (
    <div className="ui-chat-bubble ui-chat-bubble--assistant">
      <div className="ui-chat-bubble__head">
        <Lightning size={16} weight="fill" aria-hidden />
        <span className="label-caps">RepoPilot</span>
        {meta}
      </div>
      <div className="ui-chat-bubble__body">{children}</div>
    </div>
  );
}
