import { Lightning } from '@phosphor-icons/react';

type ThinkingBubbleProps = {
  label?: string;
};

/** Assistant-style typing indicator for Ask and other chat surfaces. */
export function ThinkingBubble({ label = 'Thinking' }: ThinkingBubbleProps) {
  return (
    <div className="ui-chat-bubble ui-chat-bubble--assistant ui-thinking-bubble" role="status" aria-live="polite">
      <div className="ui-chat-bubble__head">
        <Lightning size={16} weight="fill" aria-hidden />
        <span className="label-caps">RepoPilot</span>
      </div>
      <div className="ui-chat-bubble__body ui-thinking-bubble__body">
        <span className="ui-typing-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="ui-thinking-bubble__label">{label}</span>
      </div>
    </div>
  );
}
