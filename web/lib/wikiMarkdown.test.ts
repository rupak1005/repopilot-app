import { describe, expect, it } from 'vitest';
import { parseWikiMarkdown } from './wikiMarkdown';

describe('parseWikiMarkdown', () => {
  it('parses headings, paragraphs, lists, and fences', () => {
    const blocks = parseWikiMarkdown(
      `# Title

Intro paragraph.

- one
- two

\`\`\`ts
const x = 1;
\`\`\`
`
    );
    expect(blocks[0]).toEqual({ type: 'h1', text: 'Title' });
    expect(blocks[1]).toEqual({ type: 'p', text: 'Intro paragraph.' });
    expect(blocks[2]).toEqual({ type: 'ul', items: ['one', 'two'] });
    expect(blocks[3]).toEqual({ type: 'code', text: 'const x = 1;', lang: 'ts' });
  });

  it('treats horizontal rules as breaks', () => {
    expect(parseWikiMarkdown('A\n\n---\n\nB')).toEqual([
      { type: 'p', text: 'A' },
      { type: 'hr' },
      { type: 'p', text: 'B' }
    ]);
  });
});
