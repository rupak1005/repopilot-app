import { File } from '@phosphor-icons/react';
import { hotspotScoreClass } from '../../lib/metrics';
import type { HotspotRow } from '../../lib/types';
import { EmptyState } from './EmptyState';

type HotspotListProps = {
  hotspots: HotspotRow[];
  emptyMessage?: string;
};

export function HotspotList({ hotspots, emptyMessage = 'No hotspot data yet.' }: HotspotListProps) {
  if (hotspots.length === 0) {
    return (
      <EmptyState compact className="ui-hotspot-empty" icon={File} title={emptyMessage} />
    );
  }

  return (
    <div className="ui-hotspot-list">
      {hotspots.map((hotspot) => {
        const color = hotspotScoreClass(hotspot.score);
        return (
          <div key={hotspot.filePath} className="ui-hotspot-item">
            <div className="ui-hotspot-row">
              <div className="ui-hotspot-file">
                <File size={16} weight="light" aria-hidden />
                <span className="mono">{hotspot.filePath}</span>
              </div>
              <span className="ui-hotspot-score" style={{ color }}>
                {hotspot.score.toFixed(hotspot.score >= 10 ? 0 : 1)} pts
              </span>
            </div>
            <div className="ui-hotspot-bar">
              <div
                className="ui-hotspot-bar-fill"
                style={{ width: `${Math.min(hotspot.score, 100)}%`, background: color }}
              />
            </div>
            <div className="ui-hotspot-tags">
              {hotspot.reasons.slice(0, 2).map((reason) => (
                <span key={reason} className="ui-hotspot-tag">
                  {reason}
                </span>
              ))}
              <span className="ui-hotspot-tag">{hotspot.changeCount} changes</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
