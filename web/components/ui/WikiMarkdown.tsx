import type { WikiMdBlock } from '../../lib/wikiMarkdown';
import { parseWikiMarkdown } from '../../lib/wikiMarkdown';

type WikiMarkdownProps = {
  source: string;
};

function Block({ block }: { block: WikiMdBlock }) {
  switch (block.type) {
    case 'h1':
      return <h1 className="ui-wiki-md__h1">{block.text}</h1>;
    case 'h2':
      return <h2 className="ui-wiki-md__h2">{block.text}</h2>;
    case 'h3':
      return <h3 className="ui-wiki-md__h3">{block.text}</h3>;
    case 'p':
      return <p className="ui-wiki-md__p">{block.text}</p>;
    case 'ul':
      return (
        <ul className="ui-wiki-md__ul">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <pre className="ui-wiki-md__pre">
          <code data-lang={block.lang}>{block.text}</code>
        </pre>
      );
    case 'hr':
      return <hr className="ui-wiki-md__hr" />;
    default:
      return null;
  }
}

export function WikiMarkdown({ source }: WikiMarkdownProps) {
  const blocks = parseWikiMarkdown(source);
  if (blocks.length === 0) {
    return <p className="ui-wiki-md__empty">This page has no renderable content.</p>;
  }
  return (
    <div className="ui-wiki-md">
      {blocks.map((block, index) => (
        <Block key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}
