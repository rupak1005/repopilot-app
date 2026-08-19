import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowSquareOut,
  ArrowsIn,
  CircleNotch,
  Crosshair,
  MagnifyingGlass,
  X
} from '@phosphor-icons/react';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import {
  LAYER_META,
  diagramStats,
  filterForceGraphData,
  layerOf,
  neighborsOf,
  type DiagramLayer,
  type ForceGraphData,
  type ForceGraphNode
} from '../../lib/architecture';
import {
  directDependentModules,
  dependentModules,
  type ModuleDependencyTraversal
} from '../../lib/contextGraph';
import { isDemoMode } from '../../lib/demoMode';
import { repoApiPath } from '../../lib/serverApi';
import { IconButton } from './IconButton';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type GraphNode = NodeObject & ForceGraphNode;
type GraphLink = LinkObject<GraphNode>;

const LAYER_CHIPS: DiagramLayer[] = ['all', 'api', 'web', 'common'];

type ArchitectureGraphProps = {
  data: ForceGraphData;
  repoFullName?: string;
  repoId?: string;
  loading?: boolean;
};

function githubFileUrl(repoFullName: string, filePath: string): string {
  return `https://github.com/${repoFullName}/blob/HEAD/${filePath}`;
}

export function ArchitectureGraphView({
  data,
  repoFullName,
  repoId,
  loading = false
}: ArchitectureGraphProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layer, setLayer] = useState<DiagramLayer>('all');
  const [dims, setDims] = useState({ width: 800, height: 560 });
  const [neighborTraversal, setNeighborTraversal] = useState<ModuleDependencyTraversal | null>(null);
  const [neighborsLoading, setNeighborsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterForceGraphData(data, layer), [data, layer]);
  const stats = useMemo(() => diagramStats(filtered), [filtered]);

  const highlight = useMemo(
    () => (selectedId ? neighborsOf(selectedId, filtered.links) : null),
    [selectedId, filtered.links]
  );

  useEffect(() => {
    setSelectedId(null);
    setNeighborTraversal(null);
  }, [layer]);

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
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fgRef.current?.zoomToFit(400, 56), 500);
    return () => clearTimeout(t);
  }, [filtered]);

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      if (n.x == null || n.y == null) return;

      const dimmed = highlight && !highlight.has(String(n.id));
      const selected = selectedId === String(n.id);
      const lay = layerOf(n.id);
      const meta = lay === 'other' ? LAYER_META.other : LAYER_META[lay];
      const w = Math.max(72, Math.min(120, n.label.length * 6.5 + 24));
      const h = 36;
      const x = n.x - w / 2;
      const y = n.y - h / 2;
      const r = 8;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = dimmed
        ? 'rgba(24, 24, 27, 0.55)'
        : selected
          ? 'rgba(34, 211, 238, 0.14)'
          : 'rgba(24, 24, 27, 0.92)';
      ctx.fill();

      ctx.strokeStyle = dimmed
        ? 'rgba(63, 63, 70, 0.35)'
        : n.isHotspot
          ? 'rgba(251, 146, 60, 0.85)'
          : selected
            ? 'rgba(34, 211, 238, 0.95)'
            : meta.color;
      ctx.lineWidth = selected ? 2 / globalScale : 1.2 / globalScale;
      ctx.stroke();

      if (globalScale > 0.35) {
        const fontSize = Math.max(9 / globalScale, 3.2);
        ctx.font = `600 ${fontSize}px var(--font-sans, system-ui)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = dimmed ? 'rgba(161, 161, 170, 0.5)' : '#fafafa';
        const label = n.label.length > 14 ? `${n.label.slice(0, 13)}…` : n.label;
        ctx.fillText(label, n.x, n.y);
      }
    },
    [highlight, selectedId]
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
      ctx.strokeStyle = active ? 'rgba(34, 211, 238, 0.45)' : 'rgba(63, 63, 70, 0.18)';
      ctx.lineWidth = active ? 1.4 : 0.7;
      ctx.stroke();
    },
    [highlight]
  );

  const selectedNode = selectedId ? filtered.nodes.find((n) => n.id === selectedId) : undefined;

  const inbound = selectedId
    ? filtered.links.filter((l) => String(typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === selectedId).length
    : 0;

  const outbound = selectedId
    ? filtered.links.filter((l) => String(typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === selectedId).length
    : 0;

  const demoTraversal = useMemo((): ModuleDependencyTraversal | null => {
    if (!selectedId || !isDemoMode()) return null;
    const directModuleDependents = filtered.links
      .filter((l) => String(typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === selectedId)
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
            String(typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) ===
            selectedId
        )
        .map((l) => String(typeof l.target === 'object' ? (l.target as GraphNode).id : l.target))
    : [];

  return (
    <div className="ui-diagram">
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

      <div ref={containerRef} className="ui-diagram__stage">
        {loading ? (
          <div className="ui-diagram__loading">
            <CircleNotch size={28} weight="bold" className="ui-diagram__spinner" aria-hidden />
            <p>Building diagram…</p>
          </div>
        ) : filtered.nodes.length === 0 ? (
          <p className="ui-diagram__empty">No modules in this layer.</p>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={dims.width}
            height={dims.height}
            graphData={filtered}
            nodeId="id"
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            cooldownTicks={100}
            onNodeClick={(node) => setSelectedId(String((node as GraphNode).id))}
            onBackgroundClick={() => setSelectedId(null)}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={(node, color, ctx) => {
              const n = node as GraphNode;
              if (n.x == null || n.y == null) return;
              const w = Math.max(72, Math.min(120, n.label.length * 6.5 + 24));
              ctx.beginPath();
              ctx.roundRect(n.x - w / 2, n.y - 18, w, 36, 8);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkCanvasObject={paintLink}
          />
        )}

        <div className="ui-diagram__toolbar neo-canvas-bar">
          <IconButton label="Fit diagram" variant="subtle" onClick={() => fgRef.current?.zoomToFit(400, 56)}>
            <ArrowsIn size={16} weight="bold" />
          </IconButton>
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

      {selectedNode ? (
        <div className="ui-diagram__inspector" role="dialog" aria-label="Module details">
          <button
            type="button"
            className="ui-diagram__inspector-close"
            aria-label="Close"
            onClick={() => setSelectedId(null)}
          >
            <X size={14} weight="bold" />
          </button>
          <p className="ui-diagram__inspector-label">
            {(() => {
              const lay = layerOf(selectedNode.id);
              return lay === 'other' ? 'Module' : LAYER_META[lay].label;
            })()}
          </p>
          <p className="ui-diagram__inspector-path mono">{selectedNode.id}</p>
          <div className="ui-diagram__inspector-metrics">
            <span>{inbound} imports</span>
            <span>{outbound} exports</span>
            {selectedNode.isHotspot ? <span>{selectedNode.score.toFixed(0)} hotspot pts</span> : null}
          </div>
          {neighborsLoading ? (
            <p className="ui-diagram__inspector-note">Loading graph neighbors…</p>
          ) : directDependents.length > 0 || transitiveDependents.length > 0 || outboundImports.length > 0 ? (
            <div className="ui-diagram__inspector-deps">
              {directDependents.length > 0 ? (
                <div>
                  <p className="ui-diagram__inspector-deps-label label-caps">Direct dependents</p>
                  <ul>
                    {directDependents.map((mod) => (
                      <li key={mod} className="mono">
                        {mod}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {transitiveDependents.length > 0 ? (
                <div>
                  <p className="ui-diagram__inspector-deps-label label-caps">Transitive dependents</p>
                  <ul>
                    {transitiveDependents.slice(0, 6).map((mod) => (
                      <li key={mod} className="mono">
                        {mod}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {outboundImports.length > 0 ? (
                <div>
                  <p className="ui-diagram__inspector-deps-label label-caps">Imports</p>
                  <ul>
                    {outboundImports.map((mod) => (
                      <li key={mod} className="mono">
                        {mod}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
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
        </div>
      ) : (
        <p className="ui-diagram__hint">Click a module to inspect dependencies — inspired by interactive repo diagrams.</p>
      )}
    </div>
  );
}
