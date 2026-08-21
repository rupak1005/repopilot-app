import { describe, expect, it } from 'vitest';
import {
  forceToWorld,
  minimapCameraFromOrbit,
  nearestForceNodeId,
  worldToForce,
  VIZ_LAYOUT_SCALE
} from './vizSpikeCamera';

describe('vizSpikeCamera', () => {
  it('round-trips force ↔ world', () => {
    const w = forceToWorld(80, -40);
    expect(w.x).toBeCloseTo(2);
    expect(w.z).toBeCloseTo(1);
    const f = worldToForce(w.x, w.z);
    expect(f.x).toBeCloseTo(80);
    expect(f.y).toBeCloseTo(-40);
    expect(VIZ_LAYOUT_SCALE).toBe(40);
  });

  it('builds a minimap camera with positive zoom', () => {
    const cam = minimapCameraFromOrbit({
      sample: { targetX: 2, targetZ: 1, distance: 20 },
      viewWidth: 800,
      viewHeight: 600
    });
    expect(cam.k).toBeGreaterThan(0);
    expect(cam.x).toBeCloseTo(80);
    expect(cam.y).toBeCloseTo(-40);
  });

  it('picks the nearest laid-out node', () => {
    expect(
      nearestForceNodeId({ x: 10, y: 10 }, [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 12, y: 9 }
      ])
    ).toBe('b');
  });
});
