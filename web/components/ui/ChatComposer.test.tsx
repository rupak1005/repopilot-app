import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatComposer } from './ChatComposer';

describe('ChatComposer', () => {
  it('renders textarea, suggestions, and send button', () => {
    const html = renderToStaticMarkup(
      <ChatComposer
        value="How does auth work?"
        onChange={() => {}}
        onSubmit={() => {}}
        suggestions={['Explain syncRepository']}
        onSuggestion={() => {}}
      />
    );
    expect(html).toContain('How does auth work?');
    expect(html).toContain('Explain syncRepository');
    expect(html).toContain('aria-label="Send"');
    expect(html).toContain('ui-chat-composer__box');
  });

  it('disables send when empty', () => {
    const html = renderToStaticMarkup(
      <ChatComposer value="" onChange={() => {}} onSubmit={vi.fn()} />
    );
    expect(html).toContain('disabled');
  });
});
