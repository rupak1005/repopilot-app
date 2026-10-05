import { type ForceGraphData, type ForceGraphNode } from './architecture';

export function mermaidNodeId(filePath: string): string {
  return `n_${filePath.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 56)}`;
}

function mermaidLabel(label: string): string {
  return label.replace(/"/g, '#quot;').replace(/[<>]/g, '');
}

type SemanticGroup = {
  id: string;
  label: string;
  key: string;
};

function pathForNode(node: ForceGraphNode): string {
  return node.id.replace(/^cluster:/, '').toLowerCase();
}

function semanticGroupForNode(node: ForceGraphNode): SemanticGroup {
  const path = pathForNode(node);
  const leaf = path.split('/').pop() ?? path;

  const matches: Array<[RegExp, string, string]> = [
    [/\b(route|router|routing|endpoint|handler|controller)\b/, 'request_runtime', 'Request runtime'],
    [/\b(middleware|interceptor|plugin)\b/, 'middleware', 'Middleware'],
    [/\b(response|responses|encoder|encoders|serializer|serialization)\b/, 'responses', 'Response handling'],
    [/\b(dependenc|inject|container|di)\b/, 'dependencies', 'Dependency solving'],
    [/\b(schema|schemas|model|models|param|params|type|typing)\b/, 'types', 'Types & validation'],
    [/\b(security|auth|oauth|permission|token)\b/, 'security', 'Security'],
    [/\b(openapi|swagger|docs?|documentation)\b/, 'documentation', 'API documentation'],
    [/\b(websocket|socket|event|events|background|task|queue|worker)\b/, 'protocols', 'Protocols & workers'],
    [/\b(template|templates|static|asset|assets|component|components|page|pages|view|views)\b/, 'ui', 'UI & assets'],
    [/\b(database|db|persistence|repository|repositories|orm|migration|migrations)\b/, 'data', 'Data layer'],
    [/\b(test|tests|fixture|fixtures)\b/, 'tests', 'Tests'],
    [/\b(app|application|server|main|bootstrap|entrypoint)\b/, 'runtime', 'Application runtime']
  ];

  for (const [pattern, key, label] of matches) {
    if (pattern.test(path) || pattern.test(leaf)) {
      return { id: `group_${key}`, key, label };
    }
  }

  const top = path.split('/')[0] || 'root';
  const label = top
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const key = top.replace(/[^a-z0-9]+/g, '-').slice(0, 24) || 'root';
  return { id: `group_${key}`, key, label };
}

function semanticEdgeLabel(target: SemanticGroup): string {
  switch (target.key) {
    case 'request_runtime':
      return 'dispatches';
    case 'responses':
      return 'returns';
    case 'dependencies':
      return 'resolves';
    case 'types':
      return 'validates';
    case 'security':
      return 'protects';
    case 'documentation':
      return 'documents';
    case 'protocols':
      return 'supports';
    case 'data':
      return 'reads/writes';
    case 'ui':
      return 'renders';
    default:
      return 'uses';
  }
}

export type MermaidFlowchart = {
  source: string;
  idMap: Record<string, string>;
};

/**
 * Compile the evidence graph into a readable system map.
 *
 * Mermaid is deliberately a compiler target here, not an LLM output. The
 * semantic groups come from actual paths and the edges are collapsed from
 * actual import relationships. This gives the overview the same useful
 * abstraction level as a hand-drawn architecture diagram while preserving
 * file-level drill-down through idMap.
 */
export function toMermaidFlowchart(data: ForceGraphData, maxEdges = 60): MermaidFlowchart {
  const idMap: Record<string, string> = {};

  const degree = new Map<string, number>();
  for (const link of data.links) {
    const source = String(link.source);
    const target = String(link.target);
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  }

  // Keep the overview legible for very large repositories. High-degree and
  // hotspot nodes carry the most architectural signal.
  const visibleNodes = [...data.nodes]
    .sort(
      (a, b) =>
        Number(b.kind === 'cluster') - Number(a.kind === 'cluster') ||
        Number(b.isHotspot) - Number(a.isHotspot) ||
        (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
        b.val - a.val
    )
    .slice(0, 72);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const groups = new Map<string, { meta: SemanticGroup; nodes: ForceGraphNode[] }>();
  for (const node of visibleNodes) {
    const id = mermaidNodeId(node.id);
    idMap[id] = node.id;
    const meta = semanticGroupForNode(node);
    const group = groups.get(meta.id) ?? { meta, nodes: [] };
    group.nodes.push(node);
    groups.set(meta.id, group);
  }

  const groupByNode = new Map<string, SemanticGroup>();
  for (const group of groups.values()) {
    for (const node of group.nodes) groupByNode.set(node.id, group.meta);
  }

  const lines: string[] = ['flowchart LR'];
  for (const [groupId, group] of groups) {
    lines.push(`  subgraph ${groupId} ["${mermaidLabel(group.meta.label)}"]`);
    for (const node of group.nodes) {
      const id = mermaidNodeId(node.id);
      const hotspot = node.isHotspot ? ' • hotspot' : '';
      lines.push(`    ${id}["${mermaidLabel(node.label)}${hotspot}"]`);
      lines.push(`    class ${id} ${group.meta.key}`);
    }
    lines.push('  end');
  }

  const edgeKeys = new Set<string>();
  const edges = [...data.links]
    .filter((link) => visibleIds.has(String(link.source)) && visibleIds.has(String(link.target)))
    .sort((a, b) => Number(Boolean(b.uncertain)) - Number(Boolean(a.uncertain)));
  for (const link of edges) {
    const source = String(link.source);
    const target = String(link.target);
    const src = mermaidNodeId(source);
    const tgt = mermaidNodeId(target);
    const sourceGroup = groupByNode.get(source);
    const targetGroup = groupByNode.get(target);
    if (!sourceGroup || !targetGroup || !idMap[src] || !idMap[tgt]) continue;
    // Intra-subsystem imports are evidence, but rendering every one makes the
    // overview unreadable. The interactive view remains available for them.
    if (sourceGroup.id === targetGroup.id) continue;
    const key = `${src}->${tgt}`;
    if (edgeKeys.has(key) || edgeKeys.size >= maxEdges) continue;
    edgeKeys.add(key);
    const relation = semanticEdgeLabel(targetGroup);
    lines.push(`  ${src} -->|${relation}| ${tgt}`);
  }

  lines.push(
    '  classDef runtime fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:1.5px',
    '  classDef request_runtime fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:1.5px',
    '  classDef middleware fill:#ede9fe,stroke:#7c3aed,color:#3b0764,stroke-width:1.5px',
    '  classDef responses fill:#fce7f3,stroke:#db2777,color:#831843,stroke-width:1.5px',
    '  classDef dependencies fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:1.5px',
    '  classDef types fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:1.5px',
    '  classDef security fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:1.5px',
    '  classDef documentation fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-width:1.5px',
    '  classDef protocols fill:#fce7f3,stroke:#db2777,color:#831843,stroke-width:1.5px',
    '  classDef ui fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:1.5px',
    '  classDef data fill:#ccfbf1,stroke:#0f766e,color:#134e4a,stroke-width:1.5px',
    '  classDef tests fill:#f4f4f5,stroke:#71717a,color:#27272a,stroke-width:1.5px'
  );

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
