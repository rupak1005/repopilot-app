import { describe, expect, it } from 'vitest';
import { dashboardCommands, filterCommands, NAV_GROUPS } from './shellNav';

describe('shellNav', () => {
  it('groups navigation into Understand / Investigate / Change / Integrate', () => {
    const ids = NAV_GROUPS.map((g) => g.id);
    expect(ids).toEqual(['home', 'understand', 'investigate', 'change', 'integrate', 'system']);
    expect(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key))).toContain('history');
  });

  it('filters command palette entries by keyword', () => {
    const cmds = dashboardCommands('repo-1');
    const hits = filterCommands(cmds, 'graph');
    expect(hits.some((c) => c.id === 'architecture')).toBe(true);
    expect(filterCommands(cmds, 'zzzz').length).toBe(0);
  });
});
