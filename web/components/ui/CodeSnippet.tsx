import { tokenizeCode, type SyntaxTokenKind } from '../../lib/syntaxHighlight';

type CodeSnippetProps = {
  code: string;
  /** File path or fence language — drives keyword set. */
  filePath?: string | null;
  className?: string;
  maxLength?: number;
};

const KIND_CLASS: Record<SyntaxTokenKind, string> = {
  plain: 'ui-syn--plain',
  keyword: 'ui-syn--keyword',
  string: 'ui-syn--string',
  comment: 'ui-syn--comment',
  number: 'ui-syn--number',
  function: 'ui-syn--function',
  type: 'ui-syn--type',
  punct: 'ui-syn--punct'
};

export function CodeSnippet({ code, filePath, className, maxLength = 280 }: CodeSnippetProps) {
  const clipped = code.length > maxLength ? `${code.slice(0, maxLength)}…` : code;
  const tokens = tokenizeCode(clipped, filePath);
  const classes = ['ui-code-snippet', className].filter(Boolean).join(' ');
  const lang =
    filePath && !filePath.includes('/')
      ? filePath
      : filePath?.includes('.')
        ? filePath.slice(filePath.lastIndexOf('.') + 1)
        : undefined;

  return (
    <pre className={classes} data-lang={lang || undefined}>
      <code>
        {tokens.map((token, index) => (
          <span key={index} className={KIND_CLASS[token.kind]}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
}
