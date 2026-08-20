import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  TOPO_METRICS,
  layoutTopography,
  topographyRiskTone,
  type TopoCell,
  type TopoMetric
} from '../../lib/topography';
import type { HotspotRow } from '../../lib/types';
import { EmptyState } from './EmptyState';

type TopographyMapProps = {
  hotspots: HotspotRow[];
  repoId?: string | null;
};

export function TopographyMap({ hotspots, repoId }: TopographyMapProps) {
  const [metric, setMetric] = useState<TopoMetric>('score');
  const cells = useMemo(
    () => layoutTopography(hotspots, { columns: 4, metric }),
    [hotspots, metric]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = cells.find((cell) => cell.id === selectedId) ?? null;

  if (cells.length === 0) {
    return (
      <EmptyState
        compact
        title="No topography yet"
        description="Index the repo and run history ingest to score hotspots."
      />
    );
  }

  return (
    <div className="ui-topo">
      <div className="ui-topo__metrics" role="tablist" aria-label="Topography metric">
        {TOPO_METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={metric === item.id}
            className={`ui-topo__metric${metric === item.id ? ' ui-topo__metric--active' : ''}`}
            onClick={() => setMetric(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ui-topo__grid" role="list" aria-label="Codebase topography">
        {cells.map((cell) => (
          <TopoBlock
            key={cell.id}
            cell={cell}
            metric={metric}
            selected={selectedId === cell.id}
            onSelect={() => setSelectedId(cell.id === selectedId ? null : cell.id)}
          />
        ))}
      </div>

      {selected ? (
        <div className="ui-topo__inspector" aria-label={`${selected.label} cluster`}>
          <div className="ui-topo__inspector-head">
            <div>
              <p className="label-caps">Cluster</p>
              <h3 className="ui-topo__inspector-title">{selected.label}/</h3>
            </div>
            <button type="button" className="ui-topo__inspector-clear" onClick={() => setSelectedId(null)}>
              Clear
            </button>
          </div>
          <p className="ui-topo__inspector-meta">
            Metric {selected.value.toFixed(0)} · peak {selected.score.toFixed(0)} ·{' '}
            {selected.memberCount} files · {selected.changeCount} changes
          </p>
          <ul className="ui-topo__files">
            {selected.files.slice(0, 8).map((file) => {
              const href = repoId
                ? `/dashboard/${repoId}/impact?file=${encodeURIComponent(file.filePath)}`
                : null;
              return (
                <li key={file.filePath}>
                  {href ? (
                    <Link href={href} className="mono">
                      {file.filePath}
                    </Link>
                  ) : (
                    <span className="mono">{file.filePath}</span>
                  )}
                  <span className="ui-topo__file-score">{file.score.toFixed(0)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="ui-topo__hint">
          Larger blocks = hotter clusters for the selected metric. Click a block to inspect files.
        </p>
      )}
    </div>
  );
}

function TopoBlock({
  cell,
  metric,
  selected,
  onSelect
}: {
  cell: TopoCell;
  metric: TopoMetric;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = topographyRiskTone(cell.score);
  return (
    <button
      type="button"
      role="listitem"
      className={`ui-topo__block ui-topo__block--w${cell.weight} ui-topo__block--${tone}${
        selected ? ' ui-topo__block--selected' : ''
      }`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${cell.label} cluster, ${metric} ${cell.value.toFixed(0)}`}
    >
      <span className="ui-topo__block-top">
        <span className="ui-topo__block-label">{cell.label}</span>
        <span className="ui-topo__block-score">{cell.value.toFixed(0)}</span>
      </span>
      <span className="ui-topo__block-count">{cell.memberCount} files · {cell.changeCount} changes</span>
    </button>
  );
}
