import { useMemo, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react';
import { LAYER_META, layerOf } from '../../lib/architecture';
import {
  boundsFromPoints,
  clampMinimapFrame,
  minimapToWorld,
  viewportInWorld,
  worldToMinimap,
  type GraphPoint,
  type MinimapCamera
} from '../../lib/graphMinimap';

const MINI_W = 180;
const MINI_H = 120;
const NODE_W = 10;
const NODE_H = 6;

type MiniNode = {
  id: string;
  x?: number;
  y?: number;
  isHotspot?: boolean;
};

type MiniLink = {
  source: string | { id?: string };
  target: string | { id?: string };
};

type GraphMinimapProps = {
  nodes: MiniNode[];
  links?: MiniLink[];
  selectedId?: string | null;
  camera: MinimapCamera | null;
  viewWidth: number;
  viewHeight: number;
  onNavigate: (point: GraphPoint) => void;
};

function linkEndId(end: string | { id?: string }): string | null {
  if (typeof end === 'string') return end;
  return typeof end.id === 'string' ? end.id : null;
}

export function GraphMinimap({
  nodes,
  links = [],
  selectedId,
  camera,
  viewWidth,
  viewHeight,
  onNavigate
}: GraphMinimapProps) {
  const bounds = useMemo(
    () =>
      boundsFromPoints(
        nodes.map((n) => (n.x != null && n.y != null ? { x: n.x, y: n.y } : null))
      ),
    [nodes]
  );

  const positioned = useMemo(() => {
    if (!bounds) return [];
    return nodes
      .filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y))
      .map((n) => {
        const lay = layerOf(n.id);
        const meta = LAYER_META[lay];
        const point = worldToMinimap({ x: n.x!, y: n.y! }, bounds, MINI_W, MINI_H);
        return {
          id: n.id,
          hotspot: Boolean(n.isHotspot),
          selected: n.id === selectedId,
          color: n.isHotspot ? 'var(--diagram-hotspot, #d97706)' : meta.color,
          ...point
        };
      });
  }, [bounds, nodes, selectedId]);

  const byId = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);

  const edges = useMemo(() => {
    if (!bounds) return [];
    const out: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }> = [];
    for (const link of links) {
      const fromId = linkEndId(link.source);
      const toId = linkEndId(link.target);
      if (!fromId || !toId) continue;
      const a = byId.get(fromId);
      const b = byId.get(toId);
      if (!a || !b) continue;
      out.push({ key: `${fromId}->${toId}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return out;
  }, [bounds, byId, links]);

  const frame = useMemo(() => {
    if (!bounds || !camera || camera.k <= 0) return null;
    const viewport = viewportInWorld(camera, viewWidth, viewHeight);
    const a = worldToMinimap({ x: viewport.x, y: viewport.y }, bounds, MINI_W, MINI_H);
    const b = worldToMinimap(
      { x: viewport.x + viewport.width, y: viewport.y + viewport.height },
      bounds,
      MINI_W,
      MINI_H
    );
    return clampMinimapFrame(
      {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y)
      },
      MINI_W,
      MINI_H
    );
  }, [bounds, camera, viewWidth, viewHeight]);

  if (!bounds || positioned.length === 0) return null;
  const graphBounds = bounds;

  function navigateFromClient(clientX: number, clientY: number, currentTarget: Element) {
    const rect = currentTarget.getBoundingClientRect();
    const local = {
      x: ((clientX - rect.left) / rect.width) * MINI_W,
      y: ((clientY - rect.top) / rect.height) * MINI_H
    };
    onNavigate(minimapToWorld(local, graphBounds, MINI_W, MINI_H));
  }

  function onClick(event: MouseEvent<SVGSVGElement>) {
    navigateFromClient(event.clientX, event.clientY, event.currentTarget);
  }

  function onKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    navigateFromClient(rect.left + rect.width / 2, rect.top + rect.height / 2, event.currentTarget);
  }

  return (
    <svg
      className="ui-diagram-minimap"
      width={MINI_W}
      height={MINI_H}
      viewBox={`0 0 ${MINI_W} ${MINI_H}`}
      role="img"
      aria-label="Graph overview. Click to pan the main view."
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <rect className="ui-diagram-minimap__bg" x={0} y={0} width={MINI_W} height={MINI_H} rx={8} />
      {edges.map((edge) => (
        <line
          key={edge.key}
          className="ui-diagram-minimap__edge"
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
        />
      ))}
      {positioned.map((node) => (
        <rect
          key={node.id}
          className={`ui-diagram-minimap__node${
            node.selected ? ' ui-diagram-minimap__node--selected' : ''
          }${node.hotspot ? ' ui-diagram-minimap__node--hotspot' : ''}`}
          x={node.x - NODE_W / 2}
          y={node.y - NODE_H / 2}
          width={NODE_W}
          height={NODE_H}
          rx={2}
          style={{ stroke: node.color }}
        />
      ))}
      {frame ? (
        <rect
          className="ui-diagram-minimap__frame"
          x={frame.x}
          y={frame.y}
          width={frame.width}
          height={frame.height}
          rx={2}
        />
      ) : null}
    </svg>
  );
}
