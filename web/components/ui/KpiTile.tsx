import type { ReactNode } from 'react';

export type KpiTileTone = 'default' | 'success' | 'warn' | 'danger' | 'accent';

type KpiTileProps = {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  tone?: KpiTileTone;
};

export function KpiTile({ label, value, meta, tone = 'default' }: KpiTileProps) {
  return (
    <article className={`ui-kpi-tile ui-kpi-tile--${tone}`}>
      <span className="ui-kpi-tile__label label-caps">{label}</span>
      <div className="ui-kpi-tile__row">
        <span className="ui-kpi-tile__value">{value}</span>
        {meta ? <span className="ui-kpi-tile__meta">{meta}</span> : null}
      </div>
    </article>
  );
}
