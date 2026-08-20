import { describe, expect, it } from 'vitest';
import { parseRepoSlug } from './types';

describe('parseRepoSlug', () => {
  it('splits owner and name', () => {
    expect(parseRepoSlug('acme/widget')).toEqual({ owner: 'acme', name: 'widget' });
  });

  it('handles bare repo name', () => {
    expect(parseRepoSlug('widget')).toEqual({ owner: 'widget', name: 'widget' });
  });
});
