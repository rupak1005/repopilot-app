import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsIn,
  CircleNotch,
  Columns,
  Crosshair,
  DownloadSimple,
  FlowArrow,
  LinkSimple,
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
  clusterIdForPrefix,
  diagramFitPadding,
  diagramStats,
  directoryClusterKey,
  filterForceGraphData,
  layerOf,
  neighborsOf,
  nodeBoxWidth,
  parseClusterId,
  type ArchitectureViewMeta,
  type DiagramLayer,
  type ForceGraphData,
  type ForceGraphNode
} from '../../lib/architecture';
import { blastHighlightSet, blastRole, type BlastOverlay } from '../../lib/blastOverlay';
import { layoutWithDagre } from '../../lib/dagreLayout';
import { layoutWithElk, type GraphLayoutAlgo } from '../../lib/elkLayout';
import {
  cameraFromZoomTransform,
  type MinimapCamera
} from '../../lib/graphMinimap';
import {
  directDependentModules,
  dependentModules,
  type ModuleDependencyTraversal
} from '../../lib/contextGraph';
import { useDiagramColors } from '../../lib/diagramTheme';
import { isDemoMode } from '../../lib/demoMode';
import { githubModuleUrl, moduleSearchQuery } from '../../lib/modulePaths';
import { repoApiPath } from '../../lib/serverApi';
import { impactHref, withRevisionSha } from '../../lib/revisionScope';
import { toMermaidFlowchart } from '../../lib/mermaidDiagram';
import { GraphMinimap } from './GraphMinimap';
import { MermaidDiagram, type MermaidDiagramHandle } from './MermaidDiagram';
import { IconButton } from './IconButton';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type GraphNode = NodeObject & ForceGraphNode;
type GraphLink = LinkObject<GraphNode> & { uncertain?: boolean };
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

const ALGO_OPTIONS: Array<{ id: GraphLayoutAlgo; label: string; icon: typeof ShareNetwork }> = [
  { id: 'dagre', label: 'Flow', icon: ShareNetwork },
  { id: 'elk', label: 'System', icon: FlowArrow }
];

type ArchitectureGraphProps = {
  data: ForceGraphData;
  viewMeta?: ArchitectureViewMeta;
  repoFullName?: string;
  repoId?: string;
  /** When set, graph ops run against this indexed SHA instead of latest. */
  revisionSha?: string | null;
  loading?: boolean;
  initialSelectedId?: string | null;
  /** Initial Flow/System layout from `?layout=`. */
  initialLayoutAlgo?: GraphLayoutAlgo;
  expandedClusters?: string[];
  /** When set, dims everything outside the impact blast radius. */
  blastOverlay?: BlastOverlay | null;
  /** Import cycles (module SCCs) for the cycle inspector. */
  moduleCycles?: string[][];
  onGraphRebuilt?: () => void;
  onExpandCluster?: (clusterId: string) => void;
  onCollapseCluster?: (clusterId: string) => void;
  onNeighborhoodLoaded?: (extra: ForceGraphData) => void;
  /** Persist selection in the URL (`?file=`). */
  onSelectedIdChange?: (id: string | null) => void;
  /** Persist layout algorithm in the URL (`?layout=system`). */
  onLayoutAlgoChange?: (algo: GraphLayoutAlgo) => void;
  /** Layer chips — controlled so the page can filter before clustering. */
  layer?: DiagramLayer;
  onLayerChange?: (layer: DiagramLayer) => void;
  /** Absolute or path URL for the Copy link control. */
  shareUrl?: string | null;
};

type InspectorProps = {
  selectedNode: ForceGraphNode;
  inbound: number;
  outbound: number;
  neighborsLoading: boolean;
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports: string[];
  pathHint?: string | null;
  repoId?: string;
  repoFullName?: string;
  revisionSha?: string | null;
  embedded?: boolean;
  onClose: () => void;
  onSelectModule: (moduleId: string) => void;
  onExpandNeighborhood?: () => void;
  onCollapseCluster?: () => void;
  expandingNeighborhood?: boolean;
};

function DiagramInspector({
  selectedNode,
  inbound,
  outbound,
  neighborsLoading,
  directDependents,
  transitiveDependents,
  outboundImports,
  pathHint,
  repoId,
  repoFullName,
  revisionSha: scopedRevisionSha = null,
  embedded = false,
  onClose,
  onSelectModule,
  onExpandNeighborhood,
  onCollapseCluster,
  expandingNeighborhood = false
}: InspectorProps) {
  const isCluster = selectedNode.kind === 'cluster' || Boolean(parseClusterId(selectedNode.id));
  const lay = layerOf(selectedNode.id);
  const layerLabel = isCluster
    ? 'Cluster'
    : lay === 'other'
      ? 'Module'
      : LAYER_META[lay].label;
  const searchHref =
    repoId && !isCluster
      ? `/dashboard/${repoId}/search?q=${encodeURIComponent(moduleSearchQuery(selectedNode.id))}`
      : null;
  const impactHrefValue =
    repoId && !isCluster
      ? impactHref(repoId, { file: selectedNode.id, revisionSha: scopedRevisionSha })
      : null;

  async function openOnGitHub() {
    if (!repoFullName?.includes('/')) return;
    let path = selectedNode.id;
    let revisionSha = scopedRevisionSha ?? undefined;
    if (repoId) {
      try {
        const response = await fetch(
          repoApiPath(
            repoId,
            withRevisionSha(
              `resolve-path?module=${encodeURIComponent(selectedNode.id)}`,
              scopedRevisionSha
            )
          )
        );
        if (response.ok) {
          const data = (await response.json()) as { path?: string | null; revisionSha?: string };
          if (data.path) path = data.path;
          revisionSha = scopedRevisionSha ?? data.revisionSha;
        }
      } catch {
        // Fall through to alias/search URL.
      }
    }
    window.open(githubModuleUrl(repoFullName, path, revisionSha), '_blank', 'noopener,noreferrer');
  }

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
          {selectedNode.memberCount ? <span>{selectedNode.memberCount} files</span> : null}
          {selectedNode.isHotspot ? <span>{selectedNode.score.toFixed(0)} hotspot pts</span> : null}
        </div>
        {pathHint ? <p className="ui-diagram__inspector-note">{pathHint}</p> : null}
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
          {onCollapseCluster ? (
            <button type="button" className="ui-diagram__action" onClick={onCollapseCluster}>
              <Square size={14} weight="bold" aria-hidden />
              Collapse folder cluster
            </button>
          ) : null}
          {onExpandNeighborhood && !isCluster ? (
            <button
              type="button"
              className="ui-diagram__action"
              disabled={expandingNeighborhood}
              onClick={onExpandNeighborhood}
            >
              <ShareNetwork size={14} weight="bold" aria-hidden />
              {expandingNeighborhood ? 'Expanding…' : 'Expand neighborhood'}
            </button>
          ) : null}
          {impactHrefValue ? (
            <a className="ui-diagram__action" href={impactHrefValue}>
              <Crosshair size={14} weight="bold" aria-hidden />
              Show impact
            </a>
          ) : null}
          {searchHref ? (
            <a className="ui-diagram__action" href={searchHref}>
              <MagnifyingGlass size={14} weight="bold" aria-hidden />
              Search code
            </a>
          ) : null}
          {repoFullName?.includes('/') && !isCluster ? (
            <button type="button" className="ui-diagram__action ui-diagram__action--primary" onClick={() => void openOnGitHub()}>
              <ArrowSquareOut size={14} weight="bold" aria-hidden />
              Open on GitHub
            </button>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

export function ArchitectureGraphView({
  data,
  viewMeta,
  repoFullName,
  repoId,
  revisionSha = null,
  loading = false,
  initialSelectedId = null,
  initialLayoutAlgo = 'dagre',
  expandedClusters = [],
  blastOverlay = null,
  moduleCycles = [],
  onGraphRebuilt,
  onExpandCluster,
  onCollapseCluster,
  onNeighborhoodLoaded,
  onSelectedIdChange,
  onLayoutAlgoChange,
  layer: layerProp,
  onLayerChange,
  shareUrl = null
}: ArchitectureGraphProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const mermaidRef = useRef<MermaidDiagramHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = useDiagramColors();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [layerInternal, setLayerInternal] = useState<DiagramLayer>('all');
  const layer = layerProp ?? layerInternal;
  const setLayer = onLayerChange ?? setLayerInternal;
  const [dims, setDims] = useState({ width: 800, height: 560 });
  // ponytail: match CSS 960px breakpoint — upgrade path: shared useMediaQuery hook
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 960px)');
    const preferDiagram = () => {
      if (mq.matches) setLayoutMode((mode) => (mode === 'split' ? 'diagram' : mode));
    };
    preferDiagram();
    mq.addEventListener('change', preferDiagram);
    return () => mq.removeEventListener('change', preferDiagram);
  }, []);
  const [neighborTraversal, setNeighborTraversal] = useState<ModuleDependencyTraversal | null>(null);
  const [neighborsLoading, setNeighborsLoading] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [renderer, setRenderer] = useState<DiagramRenderer>('interactive');
  const [layoutAlgo, setLayoutAlgo] = useState<GraphLayoutAlgo>(initialLayoutAlgo);
  const [layoutData, setLayoutData] = useState<ForceGraphData>({ nodes: [], links: [] });
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [pathStartId, setPathStartId] = useState<string | null>(null);
  const [pathNodeIds, setPathNodeIds] = useState<Set<string> | null>(null);
  const [pathHint, setPathHint] = useState<string | null>(null);
  const [expandingNeighborhood, setExpandingNeighborhood] = useState(false);
  const [activeCycleIndex, setActiveCycleIndex] = useState<number | null>(null);
  const [minimapCamera, setMinimapCamera] = useState<MinimapCamera | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const filtered = useMemo(() => filterForceGraphData(data, layer), [data, layer]);
  const jumpNodes = useMemo(
    () =>
      [...filtered.nodes].sort((a, b) =>
        (a.label ?? a.id).localeCompare(b.label ?? b.id, undefined, { sensitivity: 'base' })
      ),
    [filtered.nodes]
  );
  const mermaidChart = useMemo(() => toMermaidFlowchart(filtered), [filtered]);
  const stats = useMemo(() => diagramStats(filtered), [filtered]);

  useEffect(() => {
    let cancelled = false;
    async function runLayout() {
      if (filtered.nodes.length === 0) {
        setLayoutData({ nodes: [], links: [] });
        setLayoutBusy(false);
        return;
      }
      if (layoutAlgo === 'dagre') {
        setLayoutData(layoutWithDagre(filtered));
        setLayoutBusy(false);
        return;
      }
      setLayoutBusy(true);
      try {
        const next = await layoutWithElk(filtered);
        if (!cancelled) setLayoutData(next);
      } catch {
        // ponytail: ELK can fail on exotic graphs — fall back to dagre rather than blank canvas.
        if (!cancelled) setLayoutData(layoutWithDagre(filtered));
      } finally {
        if (!cancelled) setLayoutBusy(false);
      }
    }
    void runLayout();
    return () => {
      cancelled = true;
    };
  }, [filtered, layoutAlgo]);

  const syncMinimapCamera = useCallback(() => {
    const fg = fgRef.current;
    if (!fg || typeof fg.zoom !== 'function' || typeof fg.centerAt !== 'function') return;
    const k = fg.zoom();
    const center = fg.centerAt();
    if (typeof k !== 'number' || !center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) {
      return;
    }
    setMinimapCamera({ k: k > 0 ? k : 1, x: center.x, y: center.y });
  }, []);

  const fitGraph = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const nodes = layoutData.nodes;
    if (nodes.length === 0) return;
    const ms = reduceMotion ? 0 : 400;
    // zoomToFit on 1–2 nodes often zooms past the viewport; pin a readable scale.
    if (nodes.length <= 2 && typeof fg.centerAt === 'function' && typeof fg.zoom === 'function') {
      const n = nodes[0]!;
      const pinMs = reduceMotion ? 0 : 300;
      fg.centerAt(n.x ?? 0, n.y ?? 0, pinMs);
      fg.zoom(1.15, pinMs);
      window.setTimeout(syncMinimapCamera, pinMs + 50);
      return;
    }
    if (typeof fg.zoomToFit === 'function') {
      fg.zoomToFit(ms, diagramFitPadding(dims.width, dims.height));
      window.setTimeout(syncMinimapCamera, ms + 50);
    }
  }, [dims.height, dims.width, layoutData.nodes, reduceMotion, syncMinimapCamera]);

  const trackMinimapDuring = useCallback(
    (ms: number) => {
      if (ms <= 0) {
        syncMinimapCamera();
        return;
      }
      const started = performance.now();
      const tick = () => {
        syncMinimapCamera();
        if (performance.now() - started < ms + 40) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [syncMinimapCamera]
  );

  const onGraphZoom = useCallback((transform: { k: number; x: number; y: number }) => {
    setMinimapCamera(cameraFromZoomTransform(transform, dims.width, dims.height));
  }, [dims.width, dims.height]);

  const navigateMinimap = useCallback(
    (point: { x: number; y: number }) => {
      const fg = fgRef.current;
      const ms = reduceMotion ? 0 : 350;
      if (fg && typeof fg.centerAt === 'function') fg.centerAt(point.x, point.y, ms);
      trackMinimapDuring(ms);
    },
    [reduceMotion, trackMinimapDuring]
  );

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

  const highlight = useMemo(() => {
    if (blastOverlay) return blastHighlightSet(blastOverlay);
    if (pathNodeIds && pathNodeIds.size > 0) return pathNodeIds;
    return selectedId ? neighborsOf(selectedId, filtered.links) : null;
  }, [blastOverlay, pathNodeIds, selectedId, filtered.links]);

  useEffect(() => {
    if (!blastOverlay) return;
    setPathHint(
      `Blast radius: ${blastOverlay.direct.length} direct · ${blastOverlay.transitive.length} transitive dependents`
    );
    setSelectedId(blastOverlay.seed);
    setPulseId(blastOverlay.seed);
  }, [blastOverlay]);

  useEffect(() => {
    setSelectedId(null);
    setNeighborTraversal(null);
    setPathStartId(null);
    setPathNodeIds(null);
    setPathHint(null);
    setActiveCycleIndex(null);
  }, [layer, data]);

  function highlightCycle(index: number) {
    const cycle = moduleCycles[index];
    if (!cycle || cycle.length === 0) return;
    setActiveCycleIndex(index);
    setPathNodeIds(new Set(cycle));
    setPathHint(`Import cycle · ${cycle.length} modules: ${cycle.join(' ↔ ')}`);
    selectModule(cycle[0]!);
    for (const path of cycle) {
      onExpandCluster?.(clusterIdForPrefix(directoryClusterKey(path)));
    }
  }

  function clearCycleHighlight() {
    setActiveCycleIndex(null);
    setPathNodeIds(null);
    setPathHint(null);
  }

  useEffect(() => {
    if (!selectedId || !repoId || isDemoMode() || parseClusterId(selectedId)) {
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
            withRevisionSha(
              `dependencies?filePath=${encodeURIComponent(activeSelectedId)}&depth=2`,
              revisionSha
            )
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
  }, [repoId, selectedId, revisionSha]);

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
    const t = setTimeout(() => {
      fitGraph();
      // zoomToFit animates ~400ms — sync the minimap frame after it settles.
      window.setTimeout(syncMinimapCamera, 450);
    }, 80);
    return () => clearTimeout(t);
  }, [layoutData, layoutMode, loading, renderer, fitGraph, syncMinimapCamera]);

  useEffect(() => {
    if (!pulseId) return;
    const t = window.setTimeout(() => setPulseId(null), 1200);
    return () => window.clearTimeout(t);
  }, [pulseId]);

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      if (n.x == null || n.y == null) return;

      const id = String(n.id);
      const role = blastOverlay && !parseClusterId(id) ? blastRole(id, blastOverlay) : null;
      const dimmed = highlight && !highlight.has(id) && !role;
      const selected = selectedId === id;
      const pulsing = pulseId === id;
      const isCluster = n.kind === 'cluster' || Boolean(parseClusterId(id));
      const lay = layerOf(n.id);
      const meta = lay === 'other' ? LAYER_META.other : LAYER_META[lay];
      const w = nodeBoxWidth(n.label);
      const h = isCluster ? 46 : 40;
      const x = n.x - w / 2;
      const y = n.y - h / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, isCluster ? 12 : 8);
      if (role === 'seed') {
        ctx.fillStyle = colors.nodeFillSelected;
      } else if (dimmed) {
        ctx.fillStyle = colors.nodeFillDim;
      } else if (selected || pulsing) {
        ctx.fillStyle = colors.nodeFillSelected;
      } else {
        ctx.fillStyle = colors.nodeFill;
      }
      ctx.fill();

      if (role === 'seed') {
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2.6 / globalScale;
      } else if (role === 'direct') {
        ctx.strokeStyle = colors.hotspot;
        ctx.lineWidth = 2.2 / globalScale;
      } else if (role === 'transitive') {
        ctx.strokeStyle = meta.color;
        ctx.lineWidth = 1.8 / globalScale;
      } else {
        ctx.strokeStyle = dimmed
          ? colors.borderDim
          : n.isHotspot
            ? colors.hotspot
            : selected || pulsing
              ? colors.accent
              : meta.color;
        ctx.lineWidth =
          selected || pulsing ? 2.2 / globalScale : isCluster ? 1.8 / globalScale : 1.2 / globalScale;
      }
      if (isCluster) ctx.setLineDash([4 / globalScale, 3 / globalScale]);
      ctx.stroke();
      ctx.setLineDash([]);

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
    [blastOverlay, colors, highlight, pulseId, selectedId]
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
      if (l.uncertain) ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    },
    [colors, highlight]
  );

  const selectModule = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setPulseId(id);
      onSelectedIdChange?.(id);
      if (!id || renderer !== 'interactive') return;
      if (parseClusterId(id)) return;
      const node = layoutData.nodes.find((n) => n.id === id) as GraphNode | undefined;
      if (node?.x != null && node?.y != null) {
        const fg = fgRef.current;
        const ms = reduceMotion ? 0 : 500;
        if (fg && typeof fg.centerAt === 'function') fg.centerAt(node.x, node.y, ms);
        if (fg && typeof fg.zoom === 'function') fg.zoom(2.2, ms);
        trackMinimapDuring(ms);
      }
    },
    [renderer, layoutData.nodes, reduceMotion, onSelectedIdChange, trackMinimapDuring]
  );

  useEffect(() => {
    if (!initialSelectedId) return;
    setSelectedId(initialSelectedId);
    setPulseId(initialSelectedId);
  }, [initialSelectedId]);

  useEffect(() => {
    setLayoutAlgo(initialLayoutAlgo);
  }, [initialLayoutAlgo]);

  const applyLayoutAlgo = useCallback(
    (algo: GraphLayoutAlgo) => {
      setLayoutAlgo(algo);
      onLayoutAlgoChange?.(algo);
    },
    [onLayoutAlgoChange]
  );

  async function copyShareLink() {
    if (!shareUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      const absolute =
        shareUrl.startsWith('http') || typeof window === 'undefined'
          ? shareUrl
          : `${window.location.origin}${shareUrl}`;
      await navigator.clipboard.writeText(absolute);
      setShareHint('Link copied');
      window.setTimeout(() => setShareHint(null), 1600);
    } catch {
      setShareHint('Copy failed');
      window.setTimeout(() => setShareHint(null), 1600);
    }
  }

  async function tracePath(fromId: string, toId: string) {
    if (!repoId || isDemoMode()) {
      setPathHint('Path tracing needs a live indexed repository.');
      return;
    }
    setPathHint('Tracing path…');
    try {
      const response = await fetch(
        repoApiPath(
          repoId,
          withRevisionSha(
            `graph?op=shortestPath&from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`,
            revisionSha
          )
        )
      );
      if (!response.ok) throw new Error('path unavailable');
      const payload = (await response.json()) as { path: string[] | null; hops: number };
      if (!payload.path) {
        setPathNodeIds(null);
        setPathHint(`No import path from ${fromId} → ${toId} within hop limit.`);
        return;
      }
      setPathNodeIds(new Set(payload.path));
      setPathHint(`Path ${payload.hops} hop${payload.hops === 1 ? '' : 's'}: ${payload.path.join(' → ')}`);
    } catch {
      setPathHint('Could not trace path.');
    }
  }

  async function expandNeighborhood(seed: string) {
    if (!repoId || isDemoMode() || expandingNeighborhood) return;
    setExpandingNeighborhood(true);
    try {
      const response = await fetch(
        repoApiPath(
          repoId,
          withRevisionSha(
            `graph?op=neighborhood&seed=${encodeURIComponent(seed)}&depth=2&limit=15`,
            revisionSha
          )
        )
      );
      if (!response.ok) throw new Error('neighborhood unavailable');
      const payload = (await response.json()) as {
        nodes: Array<{ id: string; label: string; filePath?: string; isHotspot?: boolean; score?: number }>;
        edges: Array<{ from: string; to: string }>;
      };
      const extra: ForceGraphData = {
        nodes: payload.nodes.map((n) => ({
          id: n.filePath ?? n.id.replace(/^file:/, ''),
          label: n.label,
          val: 4,
          isHotspot: Boolean(n.isHotspot),
          score: n.score ?? 0,
          kind: 'file' as const
        })),
        links: payload.edges.map((e) => ({
          source: e.from.replace(/^(file|module|ext):/, ''),
          target: e.to.replace(/^(file|module|ext):/, '')
        }))
      };
      onNeighborhoodLoaded?.(extra);
      setPathHint(
        payload.nodes.length
          ? `Merged neighborhood around ${seed} (${payload.nodes.length} modules).`
          : `No neighborhood for ${seed}.`
      );
    } catch {
      setPathHint('Could not expand neighborhood.');
    } finally {
      setExpandingNeighborhood(false);
    }
  }

  function handleNodeClick(node: object, event: MouseEvent) {
    const id = String((node as GraphNode).id);
    if (parseClusterId(id)) {
      onExpandCluster?.(id);
      selectModule(id);
      setPathHint('Expanded cluster — showing member files.');
      return;
    }
    if (event.shiftKey && pathStartId && pathStartId !== id) {
      void tracePath(pathStartId, id);
      selectModule(id);
      return;
    }
    if (event.shiftKey) {
      setPathStartId(id);
      setPathNodeIds(null);
      setPathHint(`Path start set to ${id}. Shift-click another module to trace.`);
      selectModule(id);
      return;
    }
    selectModule(id);
  }

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

  const selectedClusterId = useMemo(() => {
    if (!selectedId) return null;
    if (parseClusterId(selectedId)) return selectedId;
    const cid = clusterIdForPrefix(directoryClusterKey(selectedId));
    return expandedClusters.includes(cid) ? cid : null;
  }, [selectedId, expandedClusters]);

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
      {loading || layoutBusy ? (
        <div className="ui-diagram__loading">
          <CircleNotch size={28} weight="bold" className="ui-diagram__spinner" aria-hidden />
          <p>{layoutBusy ? 'Computing System View layout…' : 'Building diagram…'}</p>
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
          onZoom={onGraphZoom}
          onNodeDragEnd={(node) => {
            const n = node as GraphNode;
            n.fx = n.x;
            n.fy = n.y;
          }}
          onNodeClick={(node, event) => handleNodeClick(node, event as unknown as MouseEvent)}
          onBackgroundClick={() => {
            setSelectedId(null);
            onSelectedIdChange?.(null);
            setPathStartId(null);
            setPathNodeIds(null);
            setPathHint(null);
          }}
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

      {renderer === 'interactive' && layoutData.nodes.length > 0 && !loading && !layoutBusy ? (
        <GraphMinimap
          nodes={layoutData.nodes}
          links={layoutData.links}
          selectedId={selectedId}
          camera={minimapCamera}
          viewWidth={dims.width}
          viewHeight={dims.height}
          onNavigate={navigateMinimap}
        />
      ) : null}

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
        {shareUrl ? (
          <IconButton
            label={shareHint ?? 'Copy share link'}
            variant="subtle"
            onClick={() => void copyShareLink()}
          >
            <LinkSimple size={16} weight="bold" />
          </IconButton>
        ) : null}
      </div>

      <div className="ui-diagram__stats">
        <span>{stats.nodes} nodes</span>
        <span aria-hidden>·</span>
        <span>{stats.edges} deps</span>
        {viewMeta?.clustered ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {viewMeta.clusterCount} clusters / {viewMeta.totalFiles} files
            </span>
          </>
        ) : null}
        {stats.hotspots > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>{stats.hotspots} hotspots</span>
          </>
        ) : null}
        {moduleCycles.length > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>{moduleCycles.length} import cycles</span>
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
        pathHint={pathHint}
        repoId={repoId}
        repoFullName={repoFullName}
        revisionSha={revisionSha}
        onClose={() => selectModule(null)}
        onSelectModule={selectModule}
        onExpandNeighborhood={
          selectedNode.kind === 'cluster' || parseClusterId(selectedNode.id)
            ? undefined
            : () => void expandNeighborhood(selectedNode.id)
        }
        onCollapseCluster={
          selectedClusterId && onCollapseCluster
            ? () => onCollapseCluster(selectedClusterId)
            : undefined
        }
        expandingNeighborhood={expandingNeighborhood}
      />
    ) : showSidePanel ? (
      <div className="ui-diagram__panel-empty">
        <p className="ui-diagram__panel-empty-title">Select a module</p>
        <p className="ui-diagram__panel-empty-body">
          Tap a cluster to expand it, or a file to inspect.
          <span className="ui-diagram__desktop-only">
            {' '}
            Shift-click two modules to trace an import path.
          </span>
        </p>
        {moduleCycles.length > 0 ? (
          <div className="ui-diagram__cycles">
            <p className="label-caps">Import cycles ({moduleCycles.length})</p>
            <ul className="ui-diagram__cycle-list">
              {moduleCycles.slice(0, 8).map((cycle, index) => (
                <li key={cycle.join('|')}>
                  <button
                    type="button"
                    className={`ui-diagram__cycle-btn${
                      activeCycleIndex === index ? ' ui-diagram__cycle-btn--active' : ''
                    }`}
                    onClick={() =>
                      activeCycleIndex === index ? clearCycleHighlight() : highlightCycle(index)
                    }
                  >
                    {cycle.length} modules · {cycle[0]?.split('/').pop()}
                    {cycle.length > 1 ? ` ↔ ${cycle[1]?.split('/').pop()}` : ''}
                    {cycle.length > 2 ? ` +${cycle.length - 2}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
          <label className="ui-diagram__jump">
            <span className="label-caps">Jump to</span>
            <select
              className="ui-diagram__jump-select"
              value={selectedId ?? ''}
              onChange={(event) => {
                const next = event.target.value;
                selectModule(next || null);
              }}
              aria-label="Jump to module on the graph"
            >
              <option value="">Select module…</option>
              {jumpNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label ?? node.id}
                </option>
              ))}
            </select>
          </label>

          <div className="ui-diagram__layout" role="tablist" aria-label="Graph layout algorithm">
            {ALGO_OPTIONS.map(({ id, label, icon: AlgoIcon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={layoutAlgo === id}
                className={`ui-diagram__layout-btn${layoutAlgo === id ? ' ui-diagram__layout-btn--active' : ''}`}
                onClick={() => applyLayoutAlgo(id)}
                title={id === 'elk' ? 'ELK layered System View' : 'Dagre flow layout'}
              >
                <AlgoIcon size={16} weight="bold" aria-hidden />
                {label}
              </button>
            ))}
          </div>

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
          pathHint={pathHint}
          repoId={repoId}
          repoFullName={repoFullName}
          revisionSha={revisionSha}
          onClose={() => selectModule(null)}
          onSelectModule={selectModule}
          onExpandNeighborhood={
            selectedNode.kind === 'cluster' || parseClusterId(selectedNode.id)
              ? undefined
              : () => void expandNeighborhood(selectedNode.id)
          }
          onCollapseCluster={
            selectedClusterId && onCollapseCluster
              ? () => onCollapseCluster(selectedClusterId)
              : undefined
          }
          expandingNeighborhood={expandingNeighborhood}
        />
      ) : layoutMode === 'diagram' ? (
        <p className="ui-diagram__hint">
          Tap a cluster to expand.
          <span className="ui-diagram__desktop-only">
            {' '}
            Shift-click two modules to trace an import path.
          </span>
        </p>
      ) : null}
    </div>
  );
}
