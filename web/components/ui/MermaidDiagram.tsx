'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { bindMermaidNodeClicks, resolveMermaidNodePath } from '../../lib/mermaidDiagram';
import { loadMermaid } from '../../lib/mermaidClient';

export type MermaidDiagramHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  exportPng: (filename: string) => void;
  exportSvg: (filename: string) => void;
};

type MermaidDiagramProps = {
  source: string;
  idMap: Record<string, string>;
  selectedId?: string | null;
  onSelectNode?: (filePath: string | null) => void;
  className?: string;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

function highlightSelected(root: HTMLElement, idMap: Record<string, string>, selectedId: string | null) {
  root.querySelectorAll('.ui-diagram__mermaid-node--selected').forEach((node) => {
    node.classList.remove('ui-diagram__mermaid-node--selected');
  });
  if (!selectedId) return;

  root.querySelectorAll('g.node').forEach((group) => {
    const path = resolveMermaidNodePath(group, idMap);
    if (path === selectedId) {
      group.classList.add('ui-diagram__mermaid-node--selected');
    }
  });
}

function canvasBackground(): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--diagram-canvas-bg').trim() ||
    '#0c0c0e'
  );
}

export const MermaidDiagram = forwardRef<MermaidDiagramHandle, MermaidDiagramProps>(
  function MermaidDiagram({ source, idMap, selectedId, onSelectNode, className }, ref) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const renderKey = useId().replace(/:/g, '');
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const scaleRef = useRef(scale);
    const offsetRef = useRef(offset);
    const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
    const onSelectRef = useRef(onSelectNode);
    onSelectRef.current = onSelectNode;

    scaleRef.current = scale;
    offsetRef.current = offset;

    const fitView = useCallback(() => {
      const viewport = viewportRef.current;
      const svg = canvasRef.current?.querySelector('svg');
      if (!viewport || !svg) return;

      const box = svg.getBBox();
      if (box.width <= 0 || box.height <= 0) return;

      const pad = 32;
      const vw = viewport.clientWidth - pad * 2;
      const vh = viewport.clientHeight - pad * 2;
      const nextScale = Math.min(vw / box.width, vh / box.height, 1.5);
      const ox = pad + (vw - box.width * nextScale) / 2 - box.x * nextScale;
      const oy = pad + (vh - box.height * nextScale) / 2 - box.y * nextScale;
      setScale(nextScale);
      setOffset({ x: ox, y: oy });
    }, []);

    const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const prevScale = scaleRef.current;
      const prevOffset = offsetRef.current;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * factor));

      setScale(nextScale);
      setOffset({
        x: px - ((px - prevOffset.x) * nextScale) / prevScale,
        y: py - ((py - prevOffset.y) * nextScale) / prevScale
      });
    }, []);

    const zoomBy = useCallback(
      (factor: number) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
      },
      [zoomAt]
    );

    const exportSvg = useCallback((filename: string) => {
      const svg = canvasRef.current?.querySelector('svg');
      if (!svg) return;

      const clone = svg.cloneNode(true) as SVGSVGElement;
      const box = svg.getBBox();
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(Math.ceil(box.width)));
      clone.setAttribute('height', String(Math.ceil(box.height)));
      clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);

      const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
        type: 'image/svg+xml;charset=utf-8'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
      link.click();
      URL.revokeObjectURL(link.href);
    }, []);

    const exportPng = useCallback(
      (filename: string) => {
        const svg = canvasRef.current?.querySelector('svg');
        if (!svg) return;

        const clone = svg.cloneNode(true) as SVGSVGElement;
        const box = svg.getBBox();
        const w = Math.max(1, Math.ceil(box.width));
        const h = Math.max(1, Math.ceil(box.height));
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', String(w));
        clone.setAttribute('height', String(h));
        clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);

        const bg = canvasBackground();
        const xml = new XMLSerializer().serializeToString(clone);
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            exportSvg(filename);
            return;
          }
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) {
              exportSvg(filename);
              return;
            }
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pngBlob);
            link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
          }, 'image/png');
          URL.revokeObjectURL(url);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          exportSvg(filename);
        };

        img.src = url;
      },
      [exportSvg]
    );

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => zoomBy(1.2),
        zoomOut: () => zoomBy(1 / 1.2),
        fit: fitView,
        exportPng,
        exportSvg
      }),
      [zoomBy, fitView, exportPng, exportSvg]
    );

    useEffect(() => {
      const el = canvasRef.current;
      if (!el || !source.trim()) return;

      let cancelled = false;
      const cleanups: Array<() => void> = [];

      async function render() {
        const mermaid = await loadMermaid();
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? 'dark' : 'default',
          securityLevel: 'loose',
          flowchart: { useMaxWidth: false, htmlLabels: false, curve: 'basis' }
        });

        try {
          const { svg, bindFunctions } = await mermaid.render(`md-${renderKey}-${Date.now()}`, source);
          if (cancelled || !canvasRef.current) return;
          canvasRef.current.innerHTML = svg;
          bindFunctions?.(canvasRef.current);

          cleanups.push(
            bindMermaidNodeClicks(canvasRef.current, idMap, (filePath) => {
              onSelectRef.current?.(filePath);
            })
          );
          highlightSelected(canvasRef.current, idMap, selectedId ?? null);

          window.setTimeout(() => {
            if (!cancelled) fitView();
          }, 50);
        } catch {
          if (!cancelled && canvasRef.current) {
            canvasRef.current.innerHTML =
              '<p class="ui-diagram__empty">Could not render Mermaid diagram.</p>';
          }
        }
      }

      void render();
      return () => {
        cancelled = true;
        cleanups.forEach((fn) => fn());
      };
    }, [source, renderKey, idMap, fitView, selectedId]);

    useEffect(() => {
      const el = canvasRef.current;
      if (!el) return;
      highlightSelected(el, idMap, selectedId ?? null);
    }, [selectedId, idMap, source]);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      function onWheel(event: WheelEvent) {
        event.preventDefault();
        event.stopPropagation();
        const factor = event.deltaY > 0 ? 0.9 : 1.1;
        zoomAt(factor, event.clientX, event.clientY);
      }

      viewport.addEventListener('wheel', onWheel, { passive: false });
      return () => viewport.removeEventListener('wheel', onWheel);
    }, [zoomAt]);

    function onPointerDown(event: React.PointerEvent) {
      if (resolveMermaidNodePath(event.target as Element, idMap)) return;
      dragRef.current = { x: event.clientX, y: event.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
      viewportRef.current?.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: React.PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setOffset({
        x: drag.ox + (event.clientX - drag.x),
        y: drag.oy + (event.clientY - drag.y)
      });
    }

    function onPointerUp(event: React.PointerEvent) {
      if (!dragRef.current) return;
      dragRef.current = null;
      viewportRef.current?.releasePointerCapture(event.pointerId);
    }

    function onBackgroundClick(event: React.MouseEvent) {
      if (resolveMermaidNodePath(event.target as Element, idMap)) return;
      onSelectRef.current?.(null);
    }

    return (
      <div
        ref={viewportRef}
        className={className ?? 'ui-diagram__mermaid-viewport'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onBackgroundClick}
      >
        <div
          className="ui-diagram__mermaid-canvas"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          <div ref={canvasRef} className="ui-diagram__mermaid" />
        </div>
      </div>
    );
  }
);
