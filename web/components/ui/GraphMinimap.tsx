import { useMemo, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react';
import {
  boundsFromPoints,
  minimapToWorld,
  viewportInWorld,
  worldToMinimap,
  type GraphPoint,
  type MinimapCamera
} from '../../lib/graphMinimap';

const MINI_W = 168;
const MINI_H = 112;

type GraphMinimapProps = {
  nodes: Array<GraphPoint & { id: string; isHotspot?: boolean }>;
  selectedId?: string | null;
  camera: MinimapCamera | null;
  viewWidth: number;
  viewHeight: number;
  onNavigate: (point: GraphPoint) => void;
};

/** Compact overview of the force-graph world with a clickable viewport frame. */
export function GraphMinimap({
  nodes,
  selectedId,
  camera,
  viewWidth,
  viewHeight,
  onNavigate
}: GraphMinimapProps) {
  const bounds = useMemo(
    () => boundsFromPoints(nodes.map((n) => ({ x: n.x, y: n.y }))),
    [nodes]
  );

  const dots = useMemo(() => {
    if (!bounds) return [];
    return nodes
      .filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y))
      .map((n) => ({
        id: n.id,
        hotspot: Boolean(n.isHotspot),
        selected: n.id === selectedId,
        ...worldToMinimap({ x: n.x!, y: n.y! }, bounds, MINI_W, MINI_H)
      }));
  }, [bounds, nodes, selectedId]);

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
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y)
    };
  }, [bounds, camera, viewWidth, viewHeight]);

  if (!bounds || dots.length === 0) return null;
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
      aria-label="Graph minimap. Click to pan the main view."
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <rect className="ui-diagram-minimap__bg" x={0} y={0} width={MINI_W} height={MINI_H} rx={8} />
      {dots.map((dot) => (
        <circle
          key={dot.id}
          className={`ui-diagram-minimap__node${
            dot.selected ? ' ui-diagram-minimap__node--selected' : ''
          }${dot.hotspot ? ' ui-diagram-minimap__node--hotspot' : ''}`}
          cx={dot.x}
          cy={dot.y}
          r={dot.selected ? 3.5 : 2.25}
        />
      ))}
      {frame ? (
        <rect
          className="ui-diagram-minimap__frame"
          x={frame.x}
          y={frame.y}
          width={Math.max(frame.width, 8)}
          height={Math.max(frame.height, 8)}
          rx={2}
        />
      ) : null}
    </svg>
  );
}
