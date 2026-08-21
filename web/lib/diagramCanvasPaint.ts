/** Shared canvas paint helpers for the interactive architecture graph. */

export function diagramLinkControlPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number
): { cx: number; cy: number } {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const offset = curvature * len * 0.45;
  return {
    cx: midX - (dy / len) * offset,
    cy: midY + (dx / len) * offset
  };
}

/** Unit tangent at the end of a quadratic Bezier (control → end). */
export function diagramLinkEndTangent(
  cx: number,
  cy: number,
  x2: number,
  y2: number
): { ux: number; uy: number } {
  const dx = x2 - cx;
  const dy = y2 - cy;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len };
}

export function diagramLinkCurvature(dx: number, dy: number): number {
  const span = Math.hypot(dx, dy);
  if (span < 1) return 0.12;
  // Soft bow that grows slightly with distance, capped for readability.
  const signed =
    0.18 *
    Math.max(-1, Math.min(1, dx / Math.max(span, 40))) *
    Math.max(-1, Math.min(1, dy / Math.max(span, 40)));
  return Math.abs(signed) < 0.08 ? 0.14 * Math.sign(signed || 1) : signed;
}
