import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { reviewStatusVariant, StatusBadge } from './StatusBadge';

describe('reviewStatusVariant', () => {
  it('classifies failure statuses', () => {
    expect(reviewStatusVariant('failed')).toBe('fail');
    expect(reviewStatusVariant('error')).toBe('fail');
  });

  it('classifies warn/review statuses', () => {
    expect(reviewStatusVariant('needs_review')).toBe('warn');
    expect(reviewStatusVariant('warn')).toBe('warn');
  });

  it('classifies success statuses', () => {
    expect(reviewStatusVariant('passed')).toBe('success');
    expect(reviewStatusVariant('complete')).toBe('success');
    expect(reviewStatusVariant('merged')).toBe('success');
  });

  it('defaults to muted', () => {
    expect(reviewStatusVariant(null)).toBe('muted');
    expect(reviewStatusVariant('pending')).toBe('muted');
  });
});

describe('StatusBadge', () => {
  it('renders variant class and label', () => {
    const html = renderToStaticMarkup(<StatusBadge variant="success">OK</StatusBadge>);
    expect(html).toContain('ui-status-badge--success');
    expect(html).toContain('OK');
    expect(html).toContain('ui-status-badge__dot');
  });
});
