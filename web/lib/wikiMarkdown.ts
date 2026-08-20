export type WikiMdBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'code'; text: string; lang?: string }
  | { type: 'ul'; items: string[] }
  | { type: 'hr' };

export function parseWikiMarkdown(source: string): WikiMdBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: WikiMdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || undefined;
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        body.push(lines[i] ?? '');
        i += 1;
      }
      if (i < lines.length) i += 1; // closing fence
      blocks.push({ type: 'code', text: body.join('\n'), lang });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = heading[1]!.length;
      const text = heading[2]!.trim();
      blocks.push({
        type: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3',
        text
      });
      i += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemLine = (lines[i] ?? '').trim();
        if (!/^[-*+]\s+/.test(itemLine) && !/^\d+\.\s+/.test(itemLine)) break;
        items.push(itemLine.replace(/^([-*+]|\d+\.)\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const next = lines[i] ?? '';
      const t = next.trim();
      if (
        !t ||
        t.startsWith('#') ||
        t.startsWith('```') ||
        /^[-*+]\s+/.test(t) ||
        /^\d+\.\s+/.test(t) ||
        /^---+$/.test(t) ||
        /^\*\*\*+$/.test(t)
      ) {
        break;
      }
      para.push(t);
      i += 1;
    }
    if (para.length > 0) {
      blocks.push({ type: 'p', text: para.join(' ') });
    }
  }

  return blocks;
}
