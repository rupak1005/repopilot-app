import type { ReactNode } from 'react';
import type { WikiMdBlock } from '../../lib/wikiMarkdown';
import { parseWikiMarkdown } from '../../lib/wikiMarkdown';
import { CodeSnippet } from './CodeSnippet';

type WikiMarkdownProps = {
  source: string;
  className?: string;
};

/** Render **bold** and `code` spans inside a plain text run. */
export function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g).filter((part) => part.length > 0);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="ui-wiki-md__code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function Block({ block }: { block: WikiMdBlock }) {
  switch (block.type) {
    case 'h1':
      return <h1 className="ui-wiki-md__h1">{renderInlineMarkdown(block.text)}</h1>;
    case 'h2':
      return <h2 className="ui-wiki-md__h2">{renderInlineMarkdown(block.text)}</h2>;
    case 'h3':
      return <h3 className="ui-wiki-md__h3">{renderInlineMarkdown(block.text)}</h3>;
    case 'p':
      return <p className="ui-wiki-md__p">{renderInlineMarkdown(block.text)}</p>;
    case 'ul':
      return (
        <ul className="ui-wiki-md__ul">
          {block.items.map((item) => (
            <li key={item}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <CodeSnippet
          className="ui-wiki-md__pre"
          code={block.text}
          filePath={block.lang || null}
          maxLength={12_000}
        />
      );
    case 'hr':
      return <hr className="ui-wiki-md__hr" />;
    default:
      return null;
  }
}

export function WikiMarkdown({ source, className }: WikiMarkdownProps) {
  const blocks = parseWikiMarkdown(source);
  if (blocks.length === 0) {
    return <p className="ui-wiki-md__empty">This page has no renderable content.</p>;
  }
  return (
    <div className={['ui-wiki-md', className].filter(Boolean).join(' ')}>
      {blocks.map((block, index) => (
        <Block key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}
