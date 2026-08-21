import type { LodBand } from './visualizationLod';

/** Max floating labels by camera band (desktop). Compact/mobile uses selected+hover only. */
export function vizLabelCapForBand(band: LodBand): number {
  if (band === 'near') return 6;
  if (band === 'medium') return 5;
  return 1;
}

/** Min world-XZ gap between floating labels (greedy declutter). */
export function vizLabelMinSeparation(band: LodBand): number {
  if (band === 'near') return 2.8;
  if (band === 'medium') return 4.2;
  return 8;
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Which node ids may show Html labels. Compact mode (mobile / dense) keeps only
 * selection + hover. Otherwise rank by hotspot, then drop candidates that collide
 * in world XZ so clustered docs/modules don't wallpaper the stage.
 */
export function buildVizLabelBudget(args: {
  nodeIds: string[];
  hotspotScore: (id: string) => number;
  isCluster: (id: string) => boolean;
  position: (id: string) => { x: number; y: number } | null;
  selectedId: string | null;
  hoveredId: string | null;
  neighborIds: ReadonlySet<string> | null;
  band: LodBand;
  compact: boolean;
}): Set<string> {
  const out = new Set<string>();
  const placed: Array<{ x: number; y: number }> = [];
  const minSep = vizLabelMinSeparation(args.band);
  const minSep2 = minSep * minSep;
  const cap = vizLabelCapForBand(args.band);

  const tryAdd = (id: string, force: boolean) => {
    if (out.has(id) || out.size >= cap) return;
    const p = args.position(id);
    if (!force) {
      if (!p) return;
      for (const q of placed) {
        if (dist2(p, q) < minSep2) return;
      }
    }
    out.add(id);
    if (p) placed.push(p);
  };

  if (args.selectedId) tryAdd(args.selectedId, true);
  if (args.hoveredId) tryAdd(args.hoveredId, true);
  if (args.compact) return out;
  if (args.band === 'far') return out;

  if (args.neighborIds) {
    for (const id of args.neighborIds) tryAdd(id, false);
  }

  const ranked = [...args.nodeIds].sort((a, b) => {
    const clusterBoost = (id: string) => (args.isCluster(id) ? 1000 : 0);
    return (
      clusterBoost(b) +
      args.hotspotScore(b) -
      (clusterBoost(a) + args.hotspotScore(a)) || a.localeCompare(b)
    );
  });

  for (const id of ranked) {
    if (out.size >= cap) break;
    // Near: allow any candidate that fits spacing. Medium: clusters + hotspots only.
    if (args.band === 'medium' && !args.isCluster(id) && args.hotspotScore(id) < 40) {
      continue;
    }
    tryAdd(id, false);
  }
  return out;
}

/** Short file name for 3D chips; full path stays on the tag when selected. */
export function vizLabelBasename(label: string, isCluster: boolean): string {
  if (isCluster) return label;
  const base = label.split('/').pop() ?? label;
  return base.length > 22 ? `${base.slice(0, 20)}…` : base;
}
