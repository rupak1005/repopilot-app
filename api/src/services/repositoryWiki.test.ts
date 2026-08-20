import { describe, expect, it } from 'vitest';
import {
  classifyWikiPath,
  normalizeWikiFilePath,
  wikiExcerptFromContent,
  wikiTitleFromContent
} from './repositoryWiki';

describe('repositoryWiki helpers', () => {
  it('decodes %2F so wiki Read matches indexed paths', () => {
    expect(normalizeWikiFilePath('docs%2FAI_PROVIDERS.md')).toBe('docs/AI_PROVIDERS.md');
    expect(normalizeWikiFilePath('docs%252FDESIGN_SYSTEM.md')).toBe('docs/DESIGN_SYSTEM.md');
    expect(normalizeWikiFilePath('docs/already.md')).toBe('docs/already.md');
  });

  it('classifies ADR, docs, readme, and other markdown', () => {
    expect(classifyWikiPath('docs/adr/0001-auth.md')).toBe('adr');
    expect(classifyWikiPath('adr/ADR-002-caching.md')).toBe('adr');
    expect(classifyWikiPath('docs/overview.md')).toBe('docs');
    expect(classifyWikiPath('README.md')).toBe('readme');
    expect(classifyWikiPath('notes/runbook.md')).toBe('other');
    expect(classifyWikiPath('src/app.ts')).toBeNull();
  });

  it('prefers the first markdown heading for titles', () => {
    expect(wikiTitleFromContent('docs/x.md', '# Auth model\n\nBody')).toBe('Auth model');
    expect(wikiTitleFromContent('docs/my-page.md', 'no heading')).toBe('my page');
  });

  it('skips headings when building an excerpt', () => {
    expect(wikiExcerptFromContent('# Title\n\nFirst real sentence here.')).toBe(
      'First real sentence here.'
    );
  });
});
