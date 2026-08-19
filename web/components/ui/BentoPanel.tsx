import type { ReactNode } from 'react';

type BentoPanelProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

/** Phase 5 primitive — overview bento panel shell. */
export function BentoPanel({ title, action, children }: BentoPanelProps) {
  return (
    <section className="ui-bento-panel">
      <div className="ui-bento-panel__header">
        <h2 className="ui-bento-panel__title">{title}</h2>
        {action ? <div className="ui-bento-panel__action">{action}</div> : null}
      </div>
      <div className="ui-bento-panel__body">{children}</div>
    </section>
  );
}
