import type { MinimapCamera } from './graphMinimap';

/** Must match `visualizationFromLaidOutForceGraph({ scale })` on the spike page. */
export const VIZ_LAYOUT_SCALE = 40;

export function forceToWorld(fx: number, fy: number): { x: number; z: number } {
  return { x: fx / VIZ_LAYOUT_SCALE, z: -fy / VIZ_LAYOUT_SCALE };
}

export function worldToForce(x: number, z: number): { x: number; y: number } {
  return { x: x * VIZ_LAYOUT_SCALE, y: -z * VIZ_LAYOUT_SCALE };
}

export type VizOrbitSample = {
  targetX: number;
  targetZ: number;
  distance: number;
};

/** Approximate the 3D orbit frustum as a 2D minimap camera in force-layout space. */
export function minimapCameraFromOrbit(args: {
  sample: VizOrbitSample;
  viewWidth: number;
  viewHeight: number;
  fovDeg?: number;
}): MinimapCamera {
  const fov = ((args.fovDeg ?? 45) * Math.PI) / 180;
  const visibleWorldW = 2 * Math.max(args.sample.distance, 1) * Math.tan(fov / 2);
  const visibleForceW = Math.max(visibleWorldW * VIZ_LAYOUT_SCALE, 1);
  const k = Math.max(0.02, args.viewWidth / visibleForceW);
  const force = worldToForce(args.sample.targetX, args.sample.targetZ);
  return { x: force.x, y: force.y, k };
}

export function nearestForceNodeId(
  point: { x: number; y: number },
  nodes: Array<{ id: string; x?: number; y?: number }>
): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const node of nodes) {
    if (node.x == null || node.y == null) continue;
    const dx = node.x - point.x;
    const dy = node.y - point.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = node.id;
    }
  }
  return best;
}
