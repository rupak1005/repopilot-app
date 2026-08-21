import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html, Line, OrbitControls, Text } from '@react-three/drei';
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from 'react';
import * as THREE from 'three';
import type { VisualizationEdge, VisualizationGraph, VisualizationNode } from '../../lib/visualizationModel';
import { mapMetricToSize } from '../../lib/visualizationModel';
import { lodBandForDistance, type LodBand } from '../../lib/visualizationLod';
import { evaluateVizPerf } from '../../lib/vizPerfBudgets';
import { impactEdgeDashOffset, shouldAnimateImpactEdges } from '../../lib/vizImpactEdgeMotion';

export type { LodBand };
export { lodBandForDistance };

export type VizPerfStats = {
  fps: number;
  frameMs: number;
  nodes: number;
  edges: number;
  visibleLabels: number;
  drawCalls: number;
  triangles: number;
  cameraDistance: number;
};

type SceneProps = {
  graph: VisualizationGraph;
  selectedId: string | null;
  focusId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  reduceMotion: boolean;
  statsRef: MutableRefObject<VizPerfStats>;
};

function nodeColor(node: VisualizationNode, selected: boolean, dimmed: boolean): string {
  if (selected) return '#5b21b6';
  if (dimmed) return '#c4b5d4';
  if (node.blastRole === 'seed') return '#0891b2';
  if (node.blastRole === 'direct') return '#ea580c';
  if (node.blastRole === 'transitive') return '#7c3aed';
  if (node.entityType === 'test') return '#059669';
  if ((node.metrics.hotspotScore ?? 0) >= 40) return '#c2410c';
  if (node.entityType === 'cluster') return '#7c3aed';
  if (node.layer === 'api') return '#059669';
  if (node.layer === 'web') return '#2563eb';
  if (node.layer === 'common') return '#9333ea';
  return '#52525b';
}

function GraphNodeMesh({
  node,
  selected,
  dimmed,
  band,
  onSelect,
  onHover
}: {
  node: VisualizationNode;
  selected: boolean;
  dimmed: boolean;
  band: LodBand;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const pos = node.position ?? { x: 0, y: 0, z: 0 };
  const maxScore = 100;
  const size =
    node.entityType === 'cluster'
      ? 0.85
      : mapMetricToSize(node.metrics.hotspotScore ?? 10, maxScore, { min: 0.28, maxSize: 0.7 });
  const height = 0.2 + (pos.z || 0) * 0.15;
  const color = nodeColor(node, selected, dimmed);

  const showLabel =
    selected ||
    band === 'near' ||
    node.blastRole === 'seed' ||
    node.blastRole === 'direct' ||
    (band === 'medium' && (node.entityType === 'cluster' || (node.metrics.hotspotScore ?? 0) >= 40));

  const farPoint = band === 'far' && !selected;

  return (
    <group position={[pos.x, pos.z * 0.5, pos.y]}>
      {farPoint ? (
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(node.id);
          }}
          onPointerOut={() => onHover(null)}
        >
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={color} transparent opacity={dimmed ? 0.35 : 0.9} />
        </mesh>
      ) : (
        <mesh
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(node.id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = 'auto';
          }}
        >
          <boxGeometry args={[size, height, size * 0.7]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={dimmed ? 0.35 : 1}
            emissive={selected ? '#5b21b6' : '#000000'}
            emissiveIntensity={selected ? 0.25 : 0}
          />
        </mesh>
      )}
      {showLabel ? (
        <Billboard position={[0, height * 0.5 + 0.35, 0]} follow>
          {/* Troika SDF via drei Text — only for near/selected/important, not every far node */}
          <Text
            fontSize={selected ? 0.32 : band === 'near' ? 0.22 : 0.18}
            color={selected ? '#1a1025' : '#3f3f46'}
            anchorX="center"
            anchorY="middle"
            maxWidth={4}
            outlineWidth={0.01}
            outlineColor="#f5f0ff"
          >
            {node.entityType === 'cluster' ? node.label : node.label.split('/').pop() ?? node.label}
          </Text>
          {selected && node.path ? (
            <Html distanceFactor={12} position={[0, 0.4, 0]} center>
              <div className="ui-viz-spike__tag mono">{node.path}</div>
            </Html>
          ) : null}
        </Billboard>
      ) : null}
    </group>
  );
}

function ImpactPathLine({
  points,
  color,
  lineWidth,
  opacity,
  animate
}: {
  points: [THREE.Vector3, THREE.Vector3];
  color: string;
  lineWidth: number;
  opacity: number;
  animate: boolean;
}) {
  const materialRef = useRef<{ dashOffset: number } | null>(null);
  const { invalidate } = useThree();

  useFrame((state) => {
    if (!animate) return;
    const material = materialRef.current;
    if (material) {
      material.dashOffset = impactEdgeDashOffset(state.clock.elapsedTime);
    }
    invalidate();
  });

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed
      dashSize={0.22}
      gapSize={0.14}
      dashOffset={0}
      ref={(obj) => {
        const mat = obj?.material;
        materialRef.current = (Array.isArray(mat) ? mat[0] : mat) as { dashOffset: number } | null;
      }}
    />
  );
}

function GraphEdges({
  edges,
  nodesById,
  selectedId,
  band,
  reduceMotion
}: {
  edges: VisualizationEdge[];
  nodesById: Map<string, VisualizationNode>;
  selectedId: string | null;
  band: LodBand;
  reduceMotion: boolean;
}) {
  const lines = useMemo(() => {
    // Far LOD: skip most edges for draw-call budget.
    const list = band === 'far' ? edges.filter((e) => e.highlighted) : edges;
    return list
      .map((edge) => {
        const a = nodesById.get(edge.source)?.position;
        const b = nodesById.get(edge.target)?.position;
        if (!a || !b) return null;
        const related =
          selectedId && (edge.source === selectedId || edge.target === selectedId);
        return {
          edge,
          points: [
            new THREE.Vector3(a.x, a.z * 0.5, a.y),
            new THREE.Vector3(b.x, b.z * 0.5, b.y)
          ] as [THREE.Vector3, THREE.Vector3],
          related: Boolean(related)
        };
      })
      .filter(Boolean) as Array<{
      edge: VisualizationEdge;
      points: [THREE.Vector3, THREE.Vector3];
      related: boolean;
    }>;
  }, [edges, nodesById, selectedId, band]);

  const impactCount = lines.filter((l) => l.edge.type === 'impact').length;
  const animateImpact = shouldAnimateImpactEdges(reduceMotion, impactCount);

  return (
    <>
      {lines.map(({ edge, points, related }) => {
        const isImpact = edge.type === 'impact';
        const color = related
          ? '#7c3aed'
          : isImpact
            ? edge.highlighted
              ? '#ea580c'
              : '#a78bfa'
            : edge.confidence < 0.9
              ? '#a1a1aa'
              : '#9ca3af';
        const lineWidth = related || (isImpact && edge.highlighted) ? 2 : 1;
        const opacity = related
          ? 0.95
          : band === 'far'
            ? 0.15
            : isImpact
              ? edge.highlighted
                ? 0.85
                : 0.55
              : edge.confidence < 0.9
                ? 0.35
                : 0.45;

        if (isImpact) {
          return (
            <ImpactPathLine
              key={edge.id}
              points={points}
              color={color}
              lineWidth={lineWidth}
              opacity={opacity}
              animate={animateImpact}
            />
          );
        }

        return (
          <Line
            key={edge.id}
            points={points}
            color={color}
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
            dashed={edge.confidence < 0.9}
            dashSize={0.15}
            gapSize={0.1}
          />
        );
      })}
    </>
  );
}

function FocusCamera({
  focusId,
  nodesById,
  reduceMotion
}: {
  focusId: string | null;
  nodesById: Map<string, VisualizationNode>;
  reduceMotion: boolean;
}) {
  const { camera, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;

  useEffect(() => {
    if (!focusId) return;
    const node = nodesById.get(focusId);
    const p = node?.position;
    if (!p) return;
    const target = new THREE.Vector3(p.x, p.z * 0.5 + 0.5, p.y);
    const offset = new THREE.Vector3(6, 5, 8);
    const nextCam = target.clone().add(offset);
    if (reduceMotion) {
      camera.position.copy(nextCam);
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
      invalidate();
      return;
    }
    const startCam = camera.position.clone();
    const startTarget = controls?.target.clone() ?? new THREE.Vector3();
    const start = performance.now();
    const dur = 420;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(startCam, nextCam, e);
      if (controls) {
        controls.target.lerpVectors(startTarget, target, e);
        controls.update();
      }
      invalidate();
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [focusId, nodesById, camera, controls, invalidate, reduceMotion]);

  return null;
}

function PerfSampler({
  statsRef,
  nodeCount,
  edgeCount,
  labelCount
}: {
  statsRef: MutableRefObject<VizPerfStats>;
  nodeCount: number;
  edgeCount: number;
  labelCount: number;
}) {
  const { gl, camera } = useThree();
  const last = useRef(performance.now());
  const frames = useRef(0);
  const acc = useRef(0);

  useFrame(() => {
    const now = performance.now();
    const dt = now - last.current;
    last.current = now;
    frames.current += 1;
    acc.current += dt;
    const dist = camera.position.length();
    if (acc.current >= 500) {
      const fps = (frames.current * 1000) / acc.current;
      const info = gl.info.render;
      statsRef.current = {
        fps: Math.round(fps),
        frameMs: Math.round((acc.current / frames.current) * 10) / 10,
        nodes: nodeCount,
        edges: edgeCount,
        visibleLabels: labelCount,
        drawCalls: info.calls,
        triangles: info.triangles,
        cameraDistance: Math.round(dist * 10) / 10
      };
      frames.current = 0;
      acc.current = 0;
    }
  });

  return null;
}

function SceneInner({
  graph,
  selectedId,
  focusId,
  onSelect,
  onHover,
  reduceMotion,
  statsRef
}: SceneProps) {
  const { camera, invalidate } = useThree();
  const [band, setBand] = useState<LodBand>('medium');

  const nodesById = useMemo(() => {
    const map = new Map<string, VisualizationNode>();
    for (const n of graph.nodes) map.set(n.id, n);
    return map;
  }, [graph.nodes]);

  useFrame(() => {
    const next = lodBandForDistance(camera.position.length());
    setBand((prev) => (prev === next ? prev : next));
  });

  const highlighted = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const e of graph.edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [graph.edges, selectedId]);

  const labelCount = useMemo(() => {
    let n = 0;
    for (const node of graph.nodes) {
      const selected = node.id === selectedId;
      if (
        selected ||
        band === 'near' ||
        (band === 'medium' && (node.entityType === 'cluster' || (node.metrics.hotspotScore ?? 0) >= 40))
      ) {
        n += 1;
      }
    }
    return n;
  }, [graph.nodes, selectedId, band]);

  return (
    <>
      <color attach="background" args={['#f3e8ff']} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#f5f0ff', '#d4d4d8', 0.55]} />
      <directionalLight position={[8, 12, 6]} intensity={0.65} castShadow />
      <gridHelper args={[80, 40, '#d8b4fe', '#e9d5ff']} position={[0, -0.05, 0]} />

      <GraphEdges
        edges={graph.edges}
        nodesById={nodesById}
        selectedId={selectedId}
        band={band}
        reduceMotion={reduceMotion}
      />

      {graph.nodes.map((node) => (
        <GraphNodeMesh
          key={node.id}
          node={node}
          selected={node.id === selectedId}
          dimmed={Boolean(highlighted && !highlighted.has(node.id))}
          band={band}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}

      <FocusCamera focusId={focusId} nodesById={nodesById} reduceMotion={reduceMotion} />
      <PerfSampler
        statsRef={statsRef}
        nodeCount={graph.nodes.length}
        edgeCount={graph.edges.length}
        labelCount={labelCount}
      />
      <OrbitControls
        makeDefault
        enableDamping={!reduceMotion}
        dampingFactor={0.08}
        maxDistance={120}
        minDistance={4}
        onChange={() => invalidate()}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        onClick={() => onSelect(null)}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
}

type RepoPilotCanvasProps = {
  graph: VisualizationGraph;
  selectedId: string | null;
  focusId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  reduceMotion?: boolean;
  statsRef: MutableRefObject<VizPerfStats>;
  onContextLost?: () => void;
};

export function RepoPilotCanvas({
  graph,
  selectedId,
  focusId,
  onSelect,
  onHover,
  reduceMotion = false,
  statsRef,
  onContextLost
}: RepoPilotCanvasProps) {
  return (
    <div className="ui-viz-spike__canvas">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop="demand"
        camera={{ position: [18, 14, 22], fov: 45, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, invalidate }) => {
          const canvas = gl.domElement;
          const onLost = (event: Event) => {
            event.preventDefault();
            onContextLost?.();
          };
          canvas.addEventListener('webglcontextlost', onLost);
          invalidate();
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <Suspense fallback={null}>
          <SceneInner
            graph={graph}
            selectedId={selectedId}
            focusId={focusId}
            onSelect={onSelect}
            onHover={onHover}
            reduceMotion={reduceMotion}
            statsRef={statsRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export function VizStatsPanel({
  stats,
  band
}: {
  stats: VizPerfStats;
  band: LodBand;
}) {
  const report = evaluateVizPerf(
    {
      fps: stats.fps,
      frameMs: stats.frameMs,
      nodes: stats.nodes,
      drawCalls: stats.drawCalls
    },
    band
  );

  return (
    <aside className="ui-viz-spike__stats" aria-live="polite">
      <p className="label-caps">Spike perf</p>
      <p className={`ui-viz-spike__budget ui-viz-spike__budget--${report.overall}`}>
        Budget: {report.overall}
      </p>
      <dl>
        <div>
          <dt>FPS</dt>
          <dd className={`ui-viz-spike__metric--${report.fps}`}>{stats.fps || '—'}</dd>
        </div>
        <div>
          <dt>Frame</dt>
          <dd className={`ui-viz-spike__metric--${report.frame}`}>
            {stats.frameMs ? `${stats.frameMs}ms` : '—'}
          </dd>
        </div>
        <div>
          <dt>Nodes</dt>
          <dd className={`ui-viz-spike__metric--${report.scale}`}>{stats.nodes}</dd>
        </div>
        <div>
          <dt>Edges</dt>
          <dd>{stats.edges}</dd>
        </div>
        <div>
          <dt>Labels</dt>
          <dd>{stats.visibleLabels}</dd>
        </div>
        <div>
          <dt>Draws</dt>
          <dd className={`ui-viz-spike__metric--${report.draws}`}>{stats.drawCalls}</dd>
        </div>
        <div>
          <dt>Tris</dt>
          <dd>{stats.triangles}</dd>
        </div>
        <div>
          <dt>LOD</dt>
          <dd>{band}</dd>
        </div>
        <div>
          <dt>Cam</dt>
          <dd>{stats.cameraDistance}</dd>
        </div>
      </dl>
      {report.notes.length > 0 ? (
        <ul className="ui-viz-spike__budget-notes">
          {report.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

export function VizWebglFallback({ children }: { children?: ReactNode }) {
  return (
    <div className="ui-viz-spike__fallback" role="alert">
      <h2>3D visualization isn’t available</h2>
      <p>WebGL failed or was disabled. Use the 2D Architecture graph instead.</p>
      {children}
    </div>
  );
}
