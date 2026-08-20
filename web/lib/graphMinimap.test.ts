import { describe, expect, it } from 'vitest';
import {
  boundsFromPoints,
  cameraFromZoomTransform,
  clampMinimapFrame,
  minimapToWorld,
  viewportInWorld,
  worldToMinimap
} from './graphMinimap';

describe('graphMinimap', () => {
  it('builds padded bounds from node points', () => {
    const bounds = boundsFromPoints([
      { x: 0, y: 0 },
      { x: 100, y: 50 }
    ]);
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(100);
    expect(bounds!.height).toBeGreaterThan(50);
  });

  it('round-trips world ↔ minimap coordinates', () => {
    const bounds = boundsFromPoints([
      { x: 0, y: 0 },
      { x: 200, y: 100 }
    ])!;
    const mini = worldToMinimap({ x: 100, y: 50 }, bounds, 160, 100);
    const back = minimapToWorld(mini, bounds, 160, 100);
    expect(back.x).toBeCloseTo(100, 5);
    expect(back.y).toBeCloseTo(50, 5);
  });

  it('computes viewport from camera zoom', () => {
    const viewport = viewportInWorld({ x: 50, y: 40, k: 2 }, 400, 200);
    expect(viewport.width).toBe(200);
    expect(viewport.height).toBe(100);
    expect(viewport.x).toBe(-50);
    expect(viewport.y).toBe(-10);
  });

  it('maps force-graph onZoom payload (center + k) to camera', () => {
    const camera = cameraFromZoomTransform({ x: 120, y: 80, k: 2 }, 400, 200);
    expect(camera.k).toBe(2);
    expect(camera.x).toBe(120);
    expect(camera.y).toBe(80);
  });

  it('clips viewport frame to the mini canvas without relocating it', () => {
    expect(clampMinimapFrame({ x: -20, y: -10, width: 60, height: 40 }, 160, 100)).toEqual({
      x: 0,
      y: 0,
      width: 40,
      height: 30
    });
    expect(clampMinimapFrame({ x: 50, y: 40, width: 24, height: 18 }, 160, 100)).toEqual({
      x: 50,
      y: 40,
      width: 24,
      height: 18
    });
  });
});
