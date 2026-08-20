import { describe, expect, it } from 'vitest';
import {
  ownersForPath,
  parseCodeOwners,
  ruleMatchesPath
} from './codeOwners';

describe('codeOwners', () => {
  it('parses patterns and owners, skipping comments', () => {
    const rules = parseCodeOwners(`
# team defaults
* @org/everyone
*.ts @org/typescript
/api/ @org/backend @alice
`);
    expect(rules).toHaveLength(3);
    expect(rules[2]?.owners).toEqual(['@org/backend', '@alice']);
  });

  it('matches globs and uses last-match-wins', () => {
    expect(ruleMatchesPath('*.ts', 'web/lib/x.ts')).toBe(true);
    expect(ruleMatchesPath('/api/', 'api/src/server.ts')).toBe(true);
    expect(ruleMatchesPath('/api/', 'web/api/x.ts')).toBe(false);

    const rules = parseCodeOwners(`* @org/all
*.ts @org/ts
/api/ @org/api
`);
    expect(ownersForPath(rules, 'readme.md')).toEqual(['@org/all']);
    expect(ownersForPath(rules, 'web/lib/x.ts')).toEqual(['@org/ts']);
    expect(ownersForPath(rules, 'api/src/server.ts')).toEqual(['@org/api']);
  });
});
