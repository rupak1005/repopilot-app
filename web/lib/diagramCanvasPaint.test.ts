import { describe, expect, it } from 'vitest';
import {
  diagramLinkControlPoint,
  diagramLinkCurvature,
  diagramLinkEndTangent
} from './diagramCanvasPaint';

describe('diagramCanvasPaint', () => {
  it('offsets the control point perpendicular to the chord', () => {
    const { cx, cy } = diagramLinkControlPoint(0, 0, 100, 0, 0.2);
    expect(cx).toBeCloseTo(50, 5);
    expect(cy).not.toBe(0);
  });

  it('returns a unit end tangent', () => {
    const { ux, uy } = diagramLinkEndTangent(0, 0, 3, 4);
    expect(Math.hypot(ux, uy)).toBeCloseTo(1, 5);
    expect(ux).toBeCloseTo(0.6, 5);
    expect(uy).toBeCloseTo(0.8, 5);
  });

  it('keeps curvature bounded', () => {
    expect(Math.abs(diagramLinkCurvature(200, 40))).toBeLessThanOrEqual(0.2);
    expect(diagramLinkCurvature(0, 0)).toBeCloseTo(0.12, 5);
  });
});
