/**
 * Dash travel for Impact theater blast edges.
 * Negative offset flows visually source → target along the line.
 */
export function impactEdgeDashOffset(elapsedSec: number, speed = 0.85): number {
  if (!Number.isFinite(elapsedSec) || elapsedSec <= 0) return 0;
  return -((elapsedSec * speed) % 10);
}

/** Animate only when the user allows motion and the graph has impact edges. */
export function shouldAnimateImpactEdges(reduceMotion: boolean, impactEdgeCount: number): boolean {
  return !reduceMotion && impactEdgeCount > 0;
}
