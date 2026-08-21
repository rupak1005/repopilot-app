import type { LodBand } from './visualizationLod';

/** Max floating labels by camera band (desktop). Compact/mobile uses selected+hover only. */
export function vizLabelCapForBand(band: LodBand): number {
  if (band === 'near') return 18;
  if (band === 'medium') return 10;
  return 1;
}

/**
 * Which node ids may show Html labels. Compact mode (mobile / dense) keeps only
 * selection + hover so labels never wallpaper the stage or bleed over the nav drawer.
 */
export function buildVizLabelBudget(args: {
  nodeIds: string[];
  hotspotScore: (id: string) => number;
  isCluster: (id: string) => boolean;
  selectedId: string | null;
  hoveredId: string | null;
  neighborIds: ReadonlySet<string> | null;
  band: LodBand;
  compact: boolean;
}): Set<string> {
  const out = new Set<string>();
  if (args.selectedId) out.add(args.selectedId);
  if (args.hoveredId) out.add(args.hoveredId);
  if (args.compact) return out;

  const cap = vizLabelCapForBand(args.band);
  if (args.band === 'far') return out;

  if (args.neighborIds) {
    for (const id of args.neighborIds) {
      if (out.size >= cap) return out;
      out.add(id);
    }
  }

  const ranked = [...args.nodeIds].sort(
    (a, b) => args.hotspotScore(b) - args.hotspotScore(a) || a.localeCompare(b)
  );
  for (const id of ranked) {
    if (out.size >= cap) break;
    if (args.band === 'near' || args.isCluster(id) || args.hotspotScore(id) >= 40) {
      out.add(id);
    }
  }
  return out;
}

/** Short file name for 3D chips; full path stays on the tag when selected. */
export function vizLabelBasename(label: string, isCluster: boolean): string {
  if (isCluster) return label;
  const base = label.split('/').pop() ?? label;
  return base.length > 22 ? `${base.slice(0, 20)}…` : base;
}
