import { describe, expect, it } from 'vitest';
import { dashboardCommands, filterCommands, NAV_GROUPS } from './shellNav';

describe('shellNav', () => {
  it('groups navigation into Understand / Investigate / Change / Integrate', () => {
    const ids = NAV_GROUPS.map((g) => g.id);
    expect(ids).toEqual(['home', 'understand', 'investigate', 'change', 'integrate', 'system']);
    const keys = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    expect(keys).toContain('history');
    expect(keys).toContain('planning');
    expect(keys).toContain('wiki');
  });

  it('filters command palette entries by keyword', () => {
    const cmds = dashboardCommands('repo-1');
    const hits = filterCommands(cmds, 'graph');
    expect(hits.some((c) => c.id === 'architecture')).toBe(true);
    expect(filterCommands(cmds, 'plan').some((c) => c.id === 'planning')).toBe(true);
    expect(filterCommands(cmds, 'zzzz').length).toBe(0);
  });
});
