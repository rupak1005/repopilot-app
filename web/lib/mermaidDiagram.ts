import { layerOf, type ForceGraphData } from './architecture';

export function mermaidNodeId(filePath: string): string {
  return `n_${filePath.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 56)}`;
}

function mermaidLabel(label: string): string {
  return label.replace(/"/g, '#quot;');
}

export type MermaidFlowchart = {
  source: string;
  idMap: Record<string, string>;
};

/** ponytail: cap 60 edges — upgrade path: rank by degree and trim weakest links */
export function toMermaidFlowchart(data: ForceGraphData, maxEdges = 60): MermaidFlowchart {
  const idMap: Record<string, string> = {};

  const layers = new Map<string, typeof data.nodes>();
  for (const node of data.nodes) {
    const id = mermaidNodeId(node.id);
    idMap[id] = node.id;
    const layer = layerOf(node.id);
    const list = layers.get(layer) ?? [];
    list.push(node);
    layers.set(layer, list);
  }

  const lines: string[] = ['flowchart TB'];

  for (const [layer, nodes] of layers) {
    lines.push(`  subgraph ${layer} ["${layer.toUpperCase()}"]`);
    for (const node of nodes) {
      const id = mermaidNodeId(node.id);
      const hot = node.isHotspot ? ' 🔥' : '';
      lines.push(`    ${id}["${mermaidLabel(node.label)}${hot}"]`);
    }
    lines.push('  end');
  }

  const edges = data.links.slice(0, maxEdges);
  for (const link of edges) {
    const src = mermaidNodeId(String(link.source));
    const tgt = mermaidNodeId(String(link.target));
    if (idMap[src] && idMap[tgt]) {
      lines.push(`  ${src} --> ${tgt}`);
    }
  }

  return { source: lines.join('\n'), idMap };
}

export function resolveMermaidNodePath(element: Element | null, idMap: Record<string, string>): string | null {
  if (!element) return null;
  const group =
    (element.closest('g.node') as HTMLElement | null) ??
    (element.closest('g[class*="node"]') as HTMLElement | null);
  if (!group) return null;

  const fromData = group.getAttribute('data-module-id');
  if (fromData) return fromData;

  const haystack = [
    group.id,
    ...Array.from(group.querySelectorAll('[id]')).map((node) => node.id)
  ].join(' ');

  for (const [mermaidId, filePath] of Object.entries(idMap)) {
    if (haystack.includes(mermaidId)) return filePath;
  }
  return null;
}

/** Attach click handlers to rendered mermaid node groups. */
export function bindMermaidNodeClicks(
  root: HTMLElement,
  idMap: Record<string, string>,
  onSelect: (filePath: string) => void
): () => void {
  const cleanups: Array<() => void> = [];

  root.querySelectorAll('g.node').forEach((group) => {
    const el = group as HTMLElement;
    const filePath = resolveMermaidNodePath(el, idMap);
    if (!filePath) return;

    el.setAttribute('data-module-id', filePath);
    el.style.cursor = 'pointer';

    const handler = (event: Event) => {
      event.stopPropagation();
      onSelect(filePath);
    };
    el.addEventListener('click', handler);
    cleanups.push(() => el.removeEventListener('click', handler));
  });

  const delegate = (event: Event) => {
    const filePath = resolveMermaidNodePath(event.target as Element, idMap);
    if (!filePath) return;
    event.stopPropagation();
    onSelect(filePath);
  };
  root.addEventListener('click', delegate);
  cleanups.push(() => root.removeEventListener('click', delegate));

  return () => cleanups.forEach((fn) => fn());
}
