import Link from 'next/link';
import { File } from '@phosphor-icons/react';
import { hotspotScoreClass } from '../../lib/metrics';
import type { HotspotRow } from '../../lib/types';
import { EmptyState } from './EmptyState';

type HotspotListProps = {
  hotspots: HotspotRow[];
  emptyMessage?: string;
  repoId?: string | null;
  ranked?: boolean;
};

function metricTag(label: string, value: number | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value} ${label}`;
}

export function HotspotList({
  hotspots,
  emptyMessage = 'No hotspot data yet.',
  repoId,
  ranked = false
}: HotspotListProps) {
  if (hotspots.length === 0) {
    return (
      <EmptyState compact className="ui-hotspot-empty" icon={File} title={emptyMessage} />
    );
  }

  return (
    <div className={`ui-hotspot-list${ranked ? ' ui-hotspot-list--ranked' : ''}`}>
      {hotspots.map((hotspot, index) => {
        const color = hotspotScoreClass(hotspot.score);
        const extras = [
          metricTag('dependents', hotspot.dependentCount),
          metricTag('co-changes', hotspot.coChangeCount),
          metricTag('findings', hotspot.findingsCount)
        ].filter((tag): tag is string => Boolean(tag));
        const href = repoId
          ? `/dashboard/${repoId}/impact?file=${encodeURIComponent(hotspot.filePath)}`
          : null;

        return (
          <div key={hotspot.filePath} className="ui-hotspot-item">
            <div className="ui-hotspot-row">
              <div className="ui-hotspot-file">
                {ranked ? (
                  <span className="ui-hotspot-rank" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ) : (
                  <File size={16} weight="light" aria-hidden />
                )}
                {href ? (
                  <Link href={href} className="mono ui-hotspot-file-link">
                    {hotspot.filePath}
                  </Link>
                ) : (
                  <span className="mono">{hotspot.filePath}</span>
                )}
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
              {extras.map((tag) => (
                <span key={tag} className="ui-hotspot-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
