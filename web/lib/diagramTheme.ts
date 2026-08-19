import { useEffect, useState } from 'react';

export type DiagramCanvasColors = {
  canvasBg: string;
  nodeFill: string;
  nodeFillDim: string;
  nodeFillSelected: string;
  nodeText: string;
  nodeTextDim: string;
  linkActive: string;
  linkDim: string;
  accent: string;
  hotspot: string;
  borderDim: string;
};

const FALLBACK: DiagramCanvasColors = {
  canvasBg: '#0c0c0e',
  nodeFill: '#18181b',
  nodeFillDim: 'rgba(24,24,27,0.55)',
  nodeFillSelected: 'rgba(34,211,238,0.14)',
  nodeText: '#fafafa',
  nodeTextDim: 'rgba(161,161,170,0.5)',
  linkActive: 'rgba(34,211,238,0.45)',
  linkDim: 'rgba(63,63,70,0.18)',
  accent: '#22d3ee',
  hotspot: '#fb923c',
  borderDim: 'rgba(63,63,70,0.35)'
};

const VARS: Array<[keyof DiagramCanvasColors, string]> = [
  ['canvasBg', '--diagram-canvas-bg'],
  ['nodeFill', '--diagram-node-fill'],
  ['nodeFillDim', '--diagram-node-fill-dim'],
  ['nodeFillSelected', '--diagram-node-fill-selected'],
  ['nodeText', '--diagram-node-text'],
  ['nodeTextDim', '--diagram-node-text-dim'],
  ['linkActive', '--diagram-link-active'],
  ['linkDim', '--diagram-link-dim'],
  ['accent', '--diagram-accent'],
  ['hotspot', '--diagram-hotspot'],
  ['borderDim', '--diagram-border-dim']
];

function readDiagramColors(): DiagramCanvasColors {
  if (typeof document === 'undefined') return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const out = { ...FALLBACK };
  for (const [key, varName] of VARS) {
    const value = style.getPropertyValue(varName).trim();
    if (value) out[key] = value;
  }
  return out;
}

/** Reads diagram canvas tokens — updates when data-theme changes. */
export function useDiagramColors(): DiagramCanvasColors {
  const [colors, setColors] = useState<DiagramCanvasColors>(() => readDiagramColors());

  useEffect(() => {
    function sync() {
      setColors(readDiagramColors());
    }
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
