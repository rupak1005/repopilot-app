import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import {
  useEffect,
  useLayoutEffect,
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
import {
  partitionTopoRenderNodes,
  shouldUseTopoInstancing,
  topoInstanceTransform
} from '../../lib/vizTopoInstances';

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
  onOrbitSample?: (sample: { targetX: number; targetZ: number; distance: number }) => void;
  navigateWorld?: { x: number; z: number } | null;
  onNavigateDone?: () => void;
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

function nodeAccent(node: VisualizationNode): string {
  if (node.blastRole === 'seed') return '#22d3ee';
  if (node.entityType === 'cluster') return '#c4b5fd';
  if ((node.metrics.hotspotScore ?? 0) >= 40) return '#fdba74';
  if (node.layer === 'api') return '#6ee7b7';
  if (node.layer === 'web') return '#93c5fd';
  if (node.layer === 'common') return '#d8b4fe';
  return '#e4e4e7';
}

function pillarHeight(node: VisualizationNode): number {
  const z = node.position?.z ?? 0;
  if (node.entityType === 'cluster') return 0.55;
  return 0.38 + z * 0.22 + ((node.metrics.hotspotScore ?? 0) / 100) * 0.35;
}

function pillarRadius(node: VisualizationNode): number {
  if (node.entityType === 'cluster') return 0.42;
  return mapMetricToSize(node.metrics.hotspotScore ?? 10, 100, { min: 0.16, maxSize: 0.32 });
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
  const height = pillarHeight(node);
  const radius = pillarRadius(node);
  const color = nodeColor(node, selected, dimmed);
  const accent = nodeAccent(node);
  const opacity = dimmed ? 0.38 : 1;

  const showLabel =
    selected ||
    band === 'near' ||
    node.blastRole === 'seed' ||
    node.blastRole === 'direct' ||
    (band === 'medium' && (node.entityType === 'cluster' || (node.metrics.hotspotScore ?? 0) >= 40));

  const farPoint = band === 'far' && !selected;

  const pick = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(node.id);
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onHover(node.id);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      onHover(null);
      document.body.style.cursor = 'auto';
    }
  };

  return (
    <group position={[pos.x, 0, pos.y]}>
      {/* soft ground mark */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[radius * 1.55, 24]} />
        <meshBasicMaterial color="#1a1025" transparent opacity={dimmed ? 0.05 : 0.1} />
      </mesh>

      {farPoint ? (
        <mesh position={[0, 0.18, 0]} {...pick}>
          <sphereGeometry args={[0.14, 12, 10]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.4} />
        </mesh>
      ) : (
        <>
          {/* pedestal */}
          <mesh position={[0, 0.05, 0]} {...pick}>
            <cylinderGeometry args={[radius * 1.2, radius * 1.35, 0.1, 20]} />
            <meshStandardMaterial color="#f5f0ff" roughness={0.9} metalness={0} transparent opacity={opacity} />
          </mesh>
          {/* column */}
          <mesh position={[0, height * 0.5 + 0.1, 0]} {...pick}>
            <cylinderGeometry args={[radius * 0.92, radius, height, 22]} />
            <meshStandardMaterial
              color={color}
              roughness={0.42}
              metalness={0.12}
              transparent
              opacity={opacity}
              emissive={selected ? '#5b21b6' : color}
              emissiveIntensity={selected ? 0.28 : 0.04}
            />
          </mesh>
          {/* accent ring */}
          <mesh position={[0, height + 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 0.78, 0.035, 8, 24]} />
            <meshStandardMaterial
              color={accent}
              roughness={0.35}
              metalness={0.2}
              transparent
              opacity={opacity}
            />
          </mesh>
          {/* cap jewel */}
          <mesh position={[0, height + 0.16, 0]}>
            <sphereGeometry args={[radius * 0.48, 16, 12]} />
            <meshStandardMaterial
              color={selected ? '#ddd6fe' : accent}
              roughness={0.25}
              metalness={0.35}
              transparent
              opacity={opacity}
            />
          </mesh>
        </>
      )}

      {showLabel ? (
        <Html
          position={[0, height + 0.55, 0]}
          center
          distanceFactor={selected ? 9 : 13}
          style={{ pointerEvents: 'none' }}
        >
          <div className={`ui-viz-spike__label${selected ? ' ui-viz-spike__label--selected' : ''}`}>
            {node.entityType === 'cluster' ? node.label : node.label.split('/').pop() ?? node.label}
          </div>
          {selected && node.path ? <div className="ui-viz-spike__tag mono">{node.path}</div> : null}
        </Html>
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

function TopoInstancedTerrain({
  nodes,
  selectedId,
  highlighted,
  onSelect,
  onHover
}: {
  nodes: VisualizationNode[];
  selectedId: string | null;
  highlighted: Set<string> | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { invalidate } = useThree();
  const idsRef = useRef<string[]>([]);

  const poses = useMemo(() => {
    return nodes.map((node) => {
      const dimmed = Boolean(highlighted && !highlighted.has(node.id));
      const { position, scale } = topoInstanceTransform(node);
      return {
        id: node.id,
        position,
        scale,
        color: nodeColor(node, node.id === selectedId, dimmed)
      };
    });
  }, [nodes, selectedId, highlighted]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    idsRef.current = poses.map((p) => p.id);
    poses.forEach((pose, i) => {
      dummy.position.set(pose.position[0], pose.position[1], pose.position[2]);
      dummy.scale.set(pose.scale[0], pose.scale[1], pose.scale[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(pose.color);
      mesh.setColorAt(i, color);
    });
    mesh.count = poses.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [poses, invalidate]);

  if (poses.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, poses.length]}
      onClick={(e) => {
        e.stopPropagation();
        const id = idsRef.current[e.instanceId ?? -1];
        if (id) onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        const id = idsRef.current[e.instanceId ?? -1];
        if (id) {
          onHover(id);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial toneMapped={false} />
    </instancedMesh>
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
        const sourceNode = nodesById.get(edge.source);
        const targetNode = nodesById.get(edge.target);
        const a = sourceNode?.position;
        const b = targetNode?.position;
        if (!sourceNode || !targetNode || !a || !b) return null;
        const related =
          selectedId && (edge.source === selectedId || edge.target === selectedId);
        const ah = pillarHeight(sourceNode);
        const bh = pillarHeight(targetNode);
        return {
          edge,
          points: [
            new THREE.Vector3(a.x, Math.max(0.35, ah * 0.55), a.y),
            new THREE.Vector3(b.x, Math.max(0.35, bh * 0.55), b.y)
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
    const target = new THREE.Vector3(p.x, pillarHeight(node) * 0.55 + 0.2, p.y);
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
    // Always keep entity counts fresh even before the first FPS window.
    statsRef.current = {
      ...statsRef.current,
      nodes: nodeCount,
      edges: edgeCount,
      visibleLabels: labelCount,
      cameraDistance: Math.round(dist * 10) / 10
    };
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

function FitGraphCamera({ graph }: { graph: VisualizationGraph }) {
  const { camera, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  const fittedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${graph.nodes.length}:${graph.revisionSha ?? ''}:${graph.nodes[0]?.id ?? ''}`;
    if (fittedKey.current === key) return;
    if (graph.nodes.length === 0) return;
    // Wait until OrbitControls registers as default controls.
    if (!controls) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const node of graph.nodes) {
      const p = node.position ?? { x: 0, y: 0, z: 0 };
      const wx = p.x;
      const wy = pillarHeight(node) * 0.5;
      const wz = p.y;
      minX = Math.min(minX, wx);
      maxX = Math.max(maxX, wx);
      minY = Math.min(minY, wy);
      maxY = Math.max(maxY, wy);
      minZ = Math.min(minZ, wz);
      maxZ = Math.max(maxZ, wz);
    }

    const cx = (minX + maxX) / 2;
    const cy = Math.max(0.6, (minY + maxY) / 2);
    const cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxZ - minZ, 4);
    const dist = Math.max(12, span * 1.35);
    const target = new THREE.Vector3(cx, cy, cz);
    const nextCam = new THREE.Vector3(cx + dist * 0.55, cy + dist * 0.4, cz + dist * 0.7);

    camera.position.copy(nextCam);
    controls.target.copy(target);
    controls.update();
    fittedKey.current = key;
    invalidate();
  }, [graph, camera, controls, invalidate]);

  return null;
}

function SceneKick({ deps }: { deps: unknown }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
    const t = window.setTimeout(() => invalidate(), 50);
    return () => window.clearTimeout(t);
  }, [deps, invalidate]);
  return null;
}

function OrbitBridge({
  onOrbitSample,
  navigateWorld,
  onNavigateDone
}: {
  onOrbitSample?: (sample: { targetX: number; targetZ: number; distance: number }) => void;
  navigateWorld?: { x: number; z: number } | null;
  onNavigateDone?: () => void;
}) {
  const { camera, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  const lastSample = useRef(0);

  useFrame(() => {
    if (!onOrbitSample || !controls) return;
    const now = performance.now();
    if (now - lastSample.current < 140) return;
    lastSample.current = now;
    const t = controls.target;
    onOrbitSample({
      targetX: t.x,
      targetZ: t.z,
      distance: camera.position.distanceTo(t)
    });
  });

  useEffect(() => {
    if (!navigateWorld || !controls) return;
    const target = new THREE.Vector3(navigateWorld.x, 0.7, navigateWorld.z);
    const nextCam = target.clone().add(new THREE.Vector3(6.5, 5.2, 8.2));
    camera.position.copy(nextCam);
    controls.target.copy(target);
    controls.update();
    invalidate();
    onNavigateDone?.();
  }, [navigateWorld, camera, controls, invalidate, onNavigateDone]);

  return null;
}

function SceneInner({
  graph,
  selectedId,
  focusId,
  onSelect,
  onHover,
  reduceMotion,
  statsRef,
  onOrbitSample,
  navigateWorld,
  onNavigateDone
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

  const useTopoBatch = shouldUseTopoInstancing(graph.nodes.length, graph.edges.length);
  const { interactive: interactiveNodes, batched: batchedNodes } = useMemo(() => {
    if (!useTopoBatch) {
      return { interactive: graph.nodes, batched: [] as VisualizationNode[] };
    }
    return partitionTopoRenderNodes(graph.nodes, { selectedId, band });
  }, [useTopoBatch, graph.nodes, selectedId, band]);

  return (
    <>
      <color attach="background" args={['#efe6fb']} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#faf5ff', '#c4b5d4', 0.7]} />
      <directionalLight position={[10, 16, 8]} intensity={0.85} />
      <directionalLight position={[-6, 8, -4]} intensity={0.25} />
      <gridHelper args={[80, 40, '#c4b5fd', '#e9d5ff']} position={[0, 0, 0]} />

      <GraphEdges
        edges={graph.edges}
        nodesById={nodesById}
        selectedId={selectedId}
        band={band}
        reduceMotion={reduceMotion}
      />

      {useTopoBatch ? (
        <TopoInstancedTerrain
          nodes={batchedNodes}
          selectedId={selectedId}
          highlighted={highlighted}
          onSelect={onSelect}
          onHover={onHover}
        />
      ) : null}

      {interactiveNodes.map((node) => (
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
      <FitGraphCamera graph={graph} />
      <OrbitBridge
        onOrbitSample={onOrbitSample}
        navigateWorld={navigateWorld}
        onNavigateDone={onNavigateDone}
      />
      <SceneKick deps={`${graph.nodes.length}:${selectedId}:${band}`} />
      <PerfSampler
        statsRef={statsRef}
        nodeCount={graph.nodes.length}
        edgeCount={graph.edges.length}
        labelCount={labelCount}
      />
      <OrbitControls
        makeDefault
        enableDamping={!reduceMotion && graph.nodes.length > 0}
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
  onOrbitSample?: (sample: { targetX: number; targetZ: number; distance: number }) => void;
  navigateWorld?: { x: number; z: number } | null;
  onNavigateDone?: () => void;
};

export function RepoPilotCanvas({
  graph,
  selectedId,
  focusId,
  onSelect,
  onHover,
  reduceMotion = false,
  statsRef,
  onContextLost,
  onOrbitSample,
  navigateWorld = null,
  onNavigateDone
}: RepoPilotCanvasProps) {
  return (
    <div className="ui-viz-spike__canvas">
      <Canvas
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
        <SceneInner
          graph={graph}
          selectedId={selectedId}
          focusId={focusId}
          onSelect={onSelect}
          onHover={onHover}
          reduceMotion={reduceMotion}
          statsRef={statsRef}
          onOrbitSample={onOrbitSample}
          navigateWorld={navigateWorld}
          onNavigateDone={onNavigateDone}
        />
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
