import { Sparkle } from '@phosphor-icons/react';

export function DemoBanner() {
  return (
    <div className="ui-demo-banner" role="status">
      <Sparkle size={16} weight="fill" aria-hidden />
      <span>
        Demo mode — showing sample data. Set <code>NEXT_PUBLIC_DEMO_MODE=false</code> and index
        your repo via the CLI for live data.
      </span>
    </div>
  );
}
