import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastProvider } from './ToastProvider';

describe('ToastProvider', () => {
  it('renders children and toast viewport', () => {
    const html = renderToStaticMarkup(
      createElement(ToastProvider, null, createElement('p', null, 'App content'))
    );
    expect(html).toContain('ui-toast-viewport');
    expect(html).toContain('App content');
    expect(html).toContain('aria-live="polite"');
  });
});
