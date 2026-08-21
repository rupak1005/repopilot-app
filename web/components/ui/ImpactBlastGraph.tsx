import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import {
  nodeBoxWidth,
  type ForceGraphLink,
  type ForceGraphNode
} from '../../lib/architecture';
import { blastRole, type BlastOverlay } from '../../lib/blastOverlay';
import { layoutWithDagre } from '../../lib/dagreLayout';
import { useDiagramColors } from '../../lib/diagramTheme';
import { forceGraphFromFileImpact } from '../../lib/impactBlastGraph';
import { impactHref } from '../../lib/revisionScope';
import type { FileImpactAnalysis } from '../../lib/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type GraphNode = NodeObject & ForceGraphNode;
type GraphLink = LinkObject<GraphNode> & ForceGraphLink;

type ImpactBlastGraphProps = {
  impact: FileImpactAnalysis;
  repoId?: string | null;
  revisionSha?: string | null;
  height?: number;
  onSelectFile?: (filePath: string) => void;
};

export function ImpactBlastGraph({
  impact,
  repoId = null,
  revisionSha = null,
  height = 300,
  onSelectFile
}: ImpactBlastGraphProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = useDiagramColors();
  const [width, setWidth] = useState(640);

  const { data, blast } = useMemo(() => forceGraphFromFileImpact(impact), [impact]);
  const layoutData = useMemo(() => layoutWithDagre(data), [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth) || 640);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      fgRef.current?.zoomToFit?.(280, 28);
    }, 60);
    return () => window.clearTimeout(t);
  }, [layoutData, width, height]);

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      if (n.x == null || n.y == null) return;
      const id = String(n.id);
      const role = blastRole(id, blast);
      const w = nodeBoxWidth(n.label);
      const h = 36;
      const x = n.x - w / 2;
      const y = n.y - h / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fillStyle = role === 'seed' ? colors.nodeFillSelected : colors.nodeFill;
      ctx.fill();

      if (role === 'seed') {
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2.4 / globalScale;
      } else if (role === 'direct') {
        ctx.strokeStyle = colors.hotspot;
        ctx.lineWidth = 2 / globalScale;
      } else if (role === 'transitive') {
        ctx.strokeStyle = colors.linkActive;
        ctx.lineWidth = 1.6 / globalScale;
      } else {
        ctx.strokeStyle = colors.borderDim;
        ctx.lineWidth = 1.1 / globalScale;
      }
      ctx.stroke();

      if (globalScale > 0.35) {
        const fontSize = Math.max(9 / globalScale, 3.2);
        ctx.font = `600 ${fontSize}px var(--font-sans, system-ui)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.nodeText;
        ctx.fillText(n.label, n.x, n.y);
      }
    },
    [blast, colors]
  );

  const paintLink = useCallback(
    (link: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const l = link as GraphLink;
      const source = l.source as GraphNode;
      const target = l.target as GraphNode;
      if (source.x == null || source.y == null || target.x == null || target.y == null) return;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = l.uncertain ? colors.linkDim : colors.linkActive;
      ctx.lineWidth = (l.uncertain ? 1 : 1.4) / globalScale;
      if (l.uncertain) ctx.setLineDash([4 / globalScale, 3 / globalScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    },
    [colors]
  );

  function handleNodeClick(node: object) {
    const id = String((node as GraphNode).id);
    if (onSelectFile) {
      onSelectFile(id);
      return;
    }
    if (repoId && typeof window !== 'undefined') {
      window.location.assign(impactHref(repoId, { file: id, revisionSha }));
    }
  }

  return (
    <div className="ui-impact-blast-graph" ref={containerRef} aria-label="Embedded blast graph">
      <div className="ui-impact-blast-graph__legend" aria-hidden>
        <span className="ui-impact-blast-graph__swatch ui-impact-blast-graph__swatch--seed">Target</span>
        <span className="ui-impact-blast-graph__swatch ui-impact-blast-graph__swatch--direct">Direct</span>
        <span className="ui-impact-blast-graph__swatch ui-impact-blast-graph__swatch--trans">Transitive</span>
      </div>
      <ForceGraph2D
        ref={fgRef}
        graphData={layoutData}
        width={width}
        height={height}
        backgroundColor={colors.canvasBg}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as GraphNode;
          if (n.x == null || n.y == null) return;
          const w = nodeBoxWidth(n.label);
          ctx.fillStyle = color;
          ctx.fillRect(n.x - w / 2, n.y - 18, w, 36);
        }}
        onNodeClick={handleNodeClick}
        enableNodeDrag={false}
        cooldownTicks={0}
        d3AlphaDecay={1}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
      />
    </div>
  );
}

/** Exported for tests that need the overlay shape without mounting canvas. */
export type { BlastOverlay };
