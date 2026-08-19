import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsIn,
  CircleNotch,
  Columns,
  Crosshair,
  DownloadSimple,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  ShareNetwork,
  Square,
  SquareHalf,
  TreeStructure,
  X
} from '@phosphor-icons/react';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import {
  LAYER_META,
  diagramStats,
  filterForceGraphData,
  layerOf,
  neighborsOf,
  nodeBoxWidth,
  type DiagramLayer,
  type ForceGraphData,
  type ForceGraphNode
} from '../../lib/architecture';
import { layoutWithDagre } from '../../lib/dagreLayout';
import {
  directDependentModules,
  dependentModules,
  type ModuleDependencyTraversal
} from '../../lib/contextGraph';
import { useDiagramColors } from '../../lib/diagramTheme';
import { isDemoMode } from '../../lib/demoMode';
import { repoApiPath } from '../../lib/serverApi';
import { toMermaidFlowchart } from '../../lib/mermaidDiagram';
import { MermaidDiagram, type MermaidDiagramHandle } from './MermaidDiagram';
import { IconButton } from './IconButton';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type GraphNode = NodeObject & ForceGraphNode;
type GraphLink = LinkObject<GraphNode>;
type LayoutMode = 'diagram' | 'split' | 'focus';
type DiagramRenderer = 'interactive' | 'mermaid';

const LAYER_CHIPS: DiagramLayer[] = ['all', 'api', 'web', 'common'];

const RENDERER_OPTIONS: Array<{ id: DiagramRenderer; label: string; icon: typeof ShareNetwork }> = [
  { id: 'interactive', label: 'Interactive', icon: ShareNetwork },
  { id: 'mermaid', label: 'Mermaid', icon: TreeStructure }
];

const LAYOUT_OPTIONS: Array<{ id: LayoutMode; label: string; icon: typeof Square }> = [
  { id: 'diagram', label: 'Diagram', icon: Square },
  { id: 'split', label: 'Split', icon: Columns },
  { id: 'focus', label: 'Focus', icon: SquareHalf }
];

type ArchitectureGraphProps = {
  data: ForceGraphData;
  repoFullName?: string;
  repoId?: string;
  loading?: boolean;
  onGraphRebuilt?: () => void;
};

function githubFileUrl(repoFullName: string, filePath: string): string {
  return `https://github.com/${repoFullName}/blob/HEAD/${filePath}`;
}

type InspectorProps = {
  selectedNode: ForceGraphNode;
  inbound: number;
  outbound: number;
  neighborsLoading: boolean;
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports: string[];
  repoId?: string;
  repoFullName?: string;
  embedded?: boolean;
  onClose: () => void;
  onSelectModule: (moduleId: string) => void;
};

function DiagramInspector({
  selectedNode,
  inbound,
  outbound,
  neighborsLoading,
  directDependents,
  transitiveDependents,
  outboundImports,
  repoId,
  repoFullName,
  embedded = false,
  onClose,
  onSelectModule
}: InspectorProps) {
  const lay = layerOf(selectedNode.id);
  const layerLabel = lay === 'other' ? 'Module' : LAYER_META[lay].label;

  function renderModuleList(label: string, modules: string[], limit?: number) {
    const items = limit ? modules.slice(0, limit) : modules;
    if (items.length === 0) return null;
    return (
      <div className="ui-diagram__inspector-deps-group">
        <p className="ui-diagram__inspector-deps-label label-caps">{label}</p>
        <ul className="ui-diagram__inspector-deps-list">
          {items.map((mod, index) => (
            <motion.li
              key={mod}
              className="ui-diagram__inspector-dep mono"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.2 }}
            >
              <button type="button" onClick={() => onSelectModule(mod)}>
                {mod}
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={`ui-diagram__inspector${embedded ? ' ui-diagram__inspector--panel' : ''}`}
      role="region"
      aria-label="Module details"
    >
      <button type="button" className="ui-diagram__inspector-close" aria-label="Close" onClick={onClose}>
        <X size={14} weight="bold" />
      </button>
      <motion.div
        key={selectedNode.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <p className="ui-diagram__inspector-label">{layerLabel}</p>
        <p className="ui-diagram__inspector-path mono">{selectedNode.id}</p>
        <div className="ui-diagram__inspector-metrics">
          <span>{inbound} inbound</span>
          <span>{outbound} outbound</span>
          {selectedNode.isHotspot ? <span>{selectedNode.score.toFixed(0)} hotspot pts</span> : null}
        </div>
        {neighborsLoading ? (
          <p className="ui-diagram__inspector-note">Loading graph neighbors…</p>
        ) : (
          <div className="ui-diagram__inspector-deps">
            {renderModuleList('Direct dependents', directDependents)}
            {renderModuleList('Transitive dependents', transitiveDependents, 8)}
            {renderModuleList('Imports', outboundImports)}
          </div>
        )}
        <div className="ui-diagram__inspector-actions">
          {repoId ? (
            <a
              className="ui-diagram__action"
              href={`/dashboard/${repoId}/impact?file=${encodeURIComponent(selectedNode.id)}`}
            >
              <Crosshair size={14} weight="bold" aria-hidden />
              Show impact
            </a>
          ) : null}
          {repoId ? (
            <a
              className="ui-diagram__action"
              href={`/dashboard/${repoId}/search?q=${encodeURIComponent(selectedNode.id)}`}
            >
              <MagnifyingGlass size={14} weight="bold" aria-hidden />
              Search code
            </a>
          ) : null}
          {repoFullName ? (
            <a
              className="ui-diagram__action ui-diagram__action--primary"
              href={githubFileUrl(repoFullName, selectedNode.id)}
              target="_blank"
              rel="noreferrer"
            >
              <ArrowSquareOut size={14} weight="bold" aria-hidden />
              Open on GitHub
            </a>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

export function ArchitectureGraphView({
  data,
  repoFullName,
  repoId,
  loading = false,
  onGraphRebuilt
}: ArchitectureGraphProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const mermaidRef = useRef<MermaidDiagramHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = useDiagramColors();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [layer, setLayer] = useState<DiagramLayer>('all');
  const [dims, setDims] = useState({ width: 800, height: 560 });
  const [neighborTraversal, setNeighborTraversal] = useState<ModuleDependencyTraversal | null>(null);
  const [neighborsLoading, setNeighborsLoading] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [renderer, setRenderer] = useState<DiagramRenderer>('interactive');

  const filtered = useMemo(() => filterForceGraphData(data, layer), [data, layer]);
  const layoutData = useMemo(() => layoutWithDagre(filtered), [filtered]);
  const mermaidChart = useMemo(() => toMermaidFlowchart(filtered), [filtered]);
  const stats = useMemo(() => diagramStats(filtered), [filtered]);

  const fitGraph = useCallback(() => {
    const fg = fgRef.current;
    if (fg && typeof fg.zoomToFit === 'function') {
      fg.zoomToFit(400, 80);
    }
  }, []);

  const linkCurvature = useCallback((link: LinkObject) => {
    const src = link.source as GraphNode;
    const tgt = link.target as GraphNode;
    if (src.y == null || tgt.y == null || src.x == null || tgt.x == null) return 0;
    return (
      0.07 *
      Math.max(-1, Math.min(1, (tgt.x - src.x) / 5)) *
      Math.max(-1, Math.min(1, (tgt.y - src.y) / 5))
    );
  }, []);

  const highlight = useMemo(
    () => (selectedId ? neighborsOf(selectedId, filtered.links) : null),
    [selectedId, filtered.links]
  );

  useEffect(() => {
    setSelectedId(null);
    setNeighborTraversal(null);
  }, [layer, data]);

  useEffect(() => {
    if (!selectedId || !repoId || isDemoMode()) {
      setNeighborTraversal(null);
      setNeighborsLoading(false);
      return;
    }
    const activeSelectedId = selectedId;
    const activeRepoId = repoId;

    let cancelled = false;
    async function loadNeighbors() {
      setNeighborsLoading(true);
      try {
        const response = await fetch(
          repoApiPath(
            activeRepoId,
            `dependencies?filePath=${encodeURIComponent(activeSelectedId)}&depth=2`
          )
        );
        if (!response.ok) throw new Error('neighbors unavailable');
        const traversal = (await response.json()) as ModuleDependencyTraversal;
        if (!cancelled) setNeighborTraversal(traversal);
      } catch {
        if (!cancelled) setNeighborTraversal(null);
      } finally {
        if (!cancelled) setNeighborsLoading(false);
      }
    }

    void loadNeighbors();
    return () => {
      cancelled = true;
    };
  }, [repoId, selectedId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [layoutMode]);

  useEffect(() => {
    if (renderer !== 'interactive' || loading || layoutData.nodes.length === 0) return;
    const t = setTimeout(fitGraph, 80);
    return () => clearTimeout(t);
  }, [layoutData, layoutMode, loading, renderer, fitGraph]);

  useEffect(() => {
    if (!pulseId) return;
    const t = window.setTimeout(() => setPulseId(null), 1200);
    return () => window.clearTimeout(t);
  }, [pulseId]);

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      if (n.x == null || n.y == null) return;

      const dimmed = highlight && !highlight.has(String(n.id));
      const selected = selectedId === String(n.id);
      const pulsing = pulseId === String(n.id);
      const lay = layerOf(n.id);
      const meta = lay === 'other' ? LAYER_META.other : LAYER_META[lay];
      const w = nodeBoxWidth(n.label);
      const h = 40;
      const x = n.x - w / 2;
      const y = n.y - h / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fillStyle = dimmed
        ? colors.nodeFillDim
        : selected || pulsing
          ? colors.nodeFillSelected
          : colors.nodeFill;
      ctx.fill();

      ctx.strokeStyle = dimmed
        ? colors.borderDim
        : n.isHotspot
          ? colors.hotspot
          : selected || pulsing
            ? colors.accent
            : meta.color;
      ctx.lineWidth = selected || pulsing ? 2.2 / globalScale : 1.2 / globalScale;
      ctx.stroke();

      if (globalScale > 0.28) {
        const fontSize = Math.max(8.5 / globalScale, 3.4);
        ctx.font = `600 ${fontSize}px var(--font-sans, system-ui)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = dimmed ? colors.nodeTextDim : colors.nodeText;
        const label = n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label;
        ctx.fillText(label, n.x, n.y);
      }
    },
    [colors, highlight, pulseId, selectedId]
  );

  const paintLink = useCallback(
    (link: object, ctx: CanvasRenderingContext2D) => {
      const l = link as GraphLink;
      const src = l.source as GraphNode;
      const tgt = l.target as GraphNode;
      if (src.x == null || src.y == null || tgt.x == null || tgt.y == null) return;

      const srcId = String(typeof l.source === 'object' ? src.id : l.source);
      const tgtId = String(typeof l.target === 'object' ? tgt.id : l.target);
      const active = !highlight || (highlight.has(srcId) && highlight.has(tgtId));

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = active ? colors.linkActive : colors.linkDim;
      ctx.lineWidth = active ? 1.4 : 0.7;
      ctx.stroke();
    },
    [colors, highlight]
  );

  const selectModule = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setPulseId(id);
      if (!id || renderer !== 'interactive') return;
      const node = layoutData.nodes.find((n) => n.id === id) as GraphNode | undefined;
      if (node?.x != null && node?.y != null) {
        const fg = fgRef.current;
        if (fg && typeof fg.centerAt === 'function') fg.centerAt(node.x, node.y, 500);
        if (fg && typeof fg.zoom === 'function') fg.zoom(2.2, 500);
      }
    },
    [renderer, layoutData.nodes]
  );

  function exportPng() {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const slug = repoFullName?.replace('/', '-') ?? 'architecture';
    const link = document.createElement('a');
    link.download = `${slug}-diagram.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function rebuildGraph() {
    if (!repoId || isDemoMode() || rebuilding) return;
    setRebuilding(true);
    try {
      const response = await fetch(repoApiPath(repoId, 'graph/rebuild'), { method: 'POST' });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'Could not rebuild diagram');
      }
      onGraphRebuilt?.();
    } catch {
      // ponytail: parent page shows load errors on refetch
    } finally {
      setRebuilding(false);
    }
  }

  const selectedNode = useMemo((): ForceGraphNode | undefined => {
    if (!selectedId) return undefined;
    const found = filtered.nodes.find((n) => n.id === selectedId);
    if (found) return found;
    const parts = selectedId.split('/');
    return {
      id: selectedId,
      label: parts.length <= 3 ? selectedId : parts.slice(-3).join('/'),
      val: 4,
      isHotspot: false,
      score: 0
    };
  }, [selectedId, filtered.nodes]);

  const inbound = selectedId
    ? filtered.links.filter(
        (l) => String(typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === selectedId
      ).length
    : 0;

  const outbound = selectedId
    ? filtered.links.filter(
        (l) => String(typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === selectedId
      ).length
    : 0;

  const demoTraversal = useMemo((): ModuleDependencyTraversal | null => {
    if (!selectedId || !isDemoMode()) return null;
    const directModuleDependents = filtered.links
      .filter(
        (l) => String(typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === selectedId
      )
      .map((l) => ({
        fromModule: String(typeof l.source === 'object' ? (l.source as GraphNode).id : l.source),
        toModule: selectedId
      }));
    return {
      file: { filePath: selectedId },
      directModuleDependents,
      transitiveModuleDependents: [],
      graphDepth: 1
    };
  }, [filtered.links, selectedId]);

  const directDependents = neighborTraversal
    ? directDependentModules(neighborTraversal)
    : demoTraversal
      ? directDependentModules(demoTraversal)
      : [];

  const transitiveDependents = neighborTraversal
    ? dependentModules(neighborTraversal).filter((id) => !directDependents.includes(id))
    : [];

  const outboundImports = selectedId
    ? filtered.links
        .filter(
          (l) =>
            String(typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === selectedId
        )
        .map((l) => String(typeof l.target === 'object' ? (l.target as GraphNode).id : l.target))
    : [];

  const showSidePanel = layoutMode === 'split' || layoutMode === 'focus';
  const workspaceClass = `ui-diagram__workspace ui-diagram__workspace--${layoutMode}`;

  const graphStage = (
    <div ref={containerRef} className="ui-diagram__stage">
      {loading ? (
        <div className="ui-diagram__loading">
          <CircleNotch size={28} weight="bold" className="ui-diagram__spinner" aria-hidden />
          <p>Building diagram…</p>
        </div>
      ) : filtered.nodes.length === 0 ? (
        <p className="ui-diagram__empty">No modules in this layer.</p>
      ) : renderer === 'mermaid' ? (
        <MermaidDiagram
          ref={mermaidRef}
          source={mermaidChart.source}
          idMap={mermaidChart.idMap}
          selectedId={selectedId}
          onSelectNode={selectModule}
        />
      ) : (
        <ForceGraph2D
          ref={fgRef}
          width={dims.width}
          height={dims.height}
          graphData={layoutData}
          nodeId="id"
          nodeVal="val"
          nodeLabel="label"
          warmupTicks={0}
          cooldownTicks={0}
          enableNodeDrag
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={linkCurvature}
          onEngineStop={fitGraph}
          onNodeDragEnd={(node) => {
            const n = node as GraphNode;
            n.fx = n.x;
            n.fy = n.y;
          }}
          onNodeClick={(node) => selectModule(String((node as GraphNode).id))}
          onBackgroundClick={() => setSelectedId(null)}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNode;
            if (n.x == null || n.y == null) return;
            const w = nodeBoxWidth(n.label);
            ctx.beginPath();
            ctx.roundRect(n.x - w / 2, n.y - 20, w, 40, 8);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkCanvasObject={paintLink}
        />
      )}

      <div className="ui-diagram__toolbar neo-canvas-bar">
        {repoId && !isDemoMode() ? (
          <IconButton
            label="Regenerate diagram"
            variant="subtle"
            disabled={rebuilding}
            onClick={() => void rebuildGraph()}
          >
            <ArrowsClockwise
              size={16}
              weight="bold"
              className={rebuilding ? 'ui-diagram__spinner' : undefined}
            />
          </IconButton>
        ) : null}
        {renderer === 'interactive' ? (
          <IconButton label="Fit diagram" variant="subtle" onClick={fitGraph}>
            <ArrowsIn size={16} weight="bold" />
          </IconButton>
        ) : (
          <>
            <IconButton
              label="Zoom in"
              variant="subtle"
              onClick={() => {
                if (typeof mermaidRef.current?.zoomIn === 'function') mermaidRef.current.zoomIn();
              }}
            >
              <MagnifyingGlassPlus size={16} weight="bold" />
            </IconButton>
            <IconButton
              label="Zoom out"
              variant="subtle"
              onClick={() => {
                if (typeof mermaidRef.current?.zoomOut === 'function') mermaidRef.current.zoomOut();
              }}
            >
              <MagnifyingGlassMinus size={16} weight="bold" />
            </IconButton>
            <IconButton
              label="Fit diagram"
              variant="subtle"
              onClick={() => {
                if (typeof mermaidRef.current?.fit === 'function') mermaidRef.current.fit();
              }}
            >
              <ArrowsIn size={16} weight="bold" />
            </IconButton>
          </>
        )}
        {renderer === 'interactive' ? (
          <IconButton label="Export PNG" variant="subtle" onClick={exportPng}>
            <DownloadSimple size={16} weight="bold" />
          </IconButton>
        ) : (
          <IconButton
            label="Export PNG"
            variant="subtle"
            onClick={() => {
              const name = `${repoFullName?.replace('/', '-') ?? 'architecture'}-mermaid.png`;
              if (typeof mermaidRef.current?.exportPng === 'function') {
                mermaidRef.current.exportPng(name);
              }
            }}
          >
            <DownloadSimple size={16} weight="bold" />
          </IconButton>
        )}
      </div>

      <div className="ui-diagram__stats">
        <span>{stats.nodes} modules</span>
        <span aria-hidden>·</span>
        <span>{stats.edges} deps</span>
        {stats.hotspots > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>{stats.hotspots} hotspots</span>
          </>
        ) : null}
      </div>
    </div>
  );

  const inspectorPanel =
    selectedNode && showSidePanel ? (
      <DiagramInspector
        embedded
        selectedNode={selectedNode}
        inbound={inbound}
        outbound={outbound}
        neighborsLoading={neighborsLoading}
        directDependents={directDependents}
        transitiveDependents={transitiveDependents}
        outboundImports={outboundImports}
        repoId={repoId}
        repoFullName={repoFullName}
        onClose={() => setSelectedId(null)}
        onSelectModule={selectModule}
      />
    ) : showSidePanel ? (
      <div className="ui-diagram__panel-empty">
        <p className="ui-diagram__panel-empty-title">Select a module</p>
        <p className="ui-diagram__panel-empty-body">
          Click a node in the diagram to inspect dependencies, impact paths, and GitHub links.
        </p>
      </div>
    ) : null;

  return (
    <div className="ui-diagram">
      <div className="ui-diagram__controls">
        <div className="ui-diagram__chips" role="tablist" aria-label="Diagram layers">
          {LAYER_CHIPS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={layer === key}
              className={`ui-diagram__chip${layer === key ? ' ui-diagram__chip--active' : ''}`}
              onClick={() => setLayer(key)}
            >
              {key === 'all' ? 'All layers' : LAYER_META[key as Exclude<DiagramLayer, 'all'>].label}
            </button>
          ))}
        </div>

        <div className="ui-diagram__controls-right">
          <div className="ui-diagram__layout" role="tablist" aria-label="Diagram renderer">
            {RENDERER_OPTIONS.map(({ id, label, icon: RendererIcon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={renderer === id}
                className={`ui-diagram__layout-btn${renderer === id ? ' ui-diagram__layout-btn--active' : ''}`}
                onClick={() => setRenderer(id)}
              >
                <RendererIcon size={16} weight="bold" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <div className="ui-diagram__layout" role="tablist" aria-label="Layout mode">
            {LAYOUT_OPTIONS.map(({ id, label, icon: LayoutIcon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={layoutMode === id}
                className={`ui-diagram__layout-btn${layoutMode === id ? ' ui-diagram__layout-btn--active' : ''}`}
                onClick={() => setLayoutMode(id)}
              >
                <LayoutIcon size={16} weight="bold" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={workspaceClass}>
        {graphStage}
        {inspectorPanel}
      </div>

      {layoutMode === 'diagram' && selectedNode ? (
        <DiagramInspector
          selectedNode={selectedNode}
          inbound={inbound}
          outbound={outbound}
          neighborsLoading={neighborsLoading}
          directDependents={directDependents}
          transitiveDependents={transitiveDependents}
          outboundImports={outboundImports}
          repoId={repoId}
          repoFullName={repoFullName}
          onClose={() => setSelectedId(null)}
          onSelectModule={selectModule}
        />
      ) : layoutMode === 'diagram' ? (
        <p className="ui-diagram__hint">
          {renderer === 'mermaid'
            ? 'Click a module to inspect dependencies — scroll or drag to pan, wheel to zoom.'
            : 'Click a module to inspect dependencies — use Split view for side-by-side exploration.'}
        </p>
      ) : null}
    </div>
  );
}
