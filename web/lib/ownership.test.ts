import { describe, expect, it } from 'vitest';
import { formatOwnershipLabel, githubOwnerHref } from './ownership';

describe('ownership', () => {
  it('builds GitHub owner and team links', () => {
    expect(githubOwnerHref('@alice')).toBe('https://github.com/alice');
    expect(githubOwnerHref('@acme/backend')).toBe('https://github.com/orgs/acme/teams/backend');
    expect(formatOwnershipLabel(['@a', '@b'])).toBe('@a +1');
  });
});
