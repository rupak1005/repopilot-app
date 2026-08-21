import { useEffect, useState } from 'react';

export type DiagramCanvasColors = {
  canvasBg: string;
  nodeFill: string;
  nodeFillDim: string;
  nodeFillSelected: string;
  nodeText: string;
  nodeTextDim: string;
  nodeBorder: string;
  linkActive: string;
  linkDim: string;
  accent: string;
  hotspot: string;
  borderDim: string;
};

const FALLBACK: DiagramCanvasColors = {
  canvasBg: '#efe6f8',
  nodeFill: '#f3e8ff',
  nodeFillDim: 'rgba(233, 213, 255, 0.55)',
  nodeFillSelected: 'rgba(196, 181, 253, 0.55)',
  nodeText: '#1a1025',
  nodeTextDim: 'rgba(82, 82, 91, 0.55)',
  nodeBorder: 'rgba(167, 139, 250, 0.85)',
  linkActive: 'rgba(113, 113, 122, 0.55)',
  linkDim: 'rgba(161, 161, 170, 0.28)',
  accent: '#7c3aed',
  hotspot: '#ea580c',
  borderDim: 'rgba(196, 181, 253, 0.4)'
};

const VARS: Array<[keyof DiagramCanvasColors, string]> = [
  ['canvasBg', '--diagram-canvas-bg'],
  ['nodeFill', '--diagram-node-fill'],
  ['nodeFillDim', '--diagram-node-fill-dim'],
  ['nodeFillSelected', '--diagram-node-fill-selected'],
  ['nodeText', '--diagram-node-text'],
  ['nodeTextDim', '--diagram-node-text-dim'],
  ['nodeBorder', '--diagram-node-border'],
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
