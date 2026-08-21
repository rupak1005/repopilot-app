# 3D Architecture Spike (R3F)

**Status:** isolated prototype · production Architecture stays 2D  
**Route:** `/dashboard/[repoId]/viz-spike`  
**Kill switch:** `NEXT_PUBLIC_VIZ_3D_SPIKE=false`

## Goals

Prove that RepoPilot can render **real architecture graph + dagre/ELK layout positions** in React Three Fiber without changing the analysis engine — and compare UX/perf to the existing 2D force-graph before any product integration.

## Adapter boundary (2D and 3D share this)

```
GET …/architecture          ← analysis / Context Graph (unchanged)
        ↓
buildArchitectureView       ← clustering / layer view (unchanged)
        ↓
layoutWithDagre | layoutWithElk   ← pixel positions on ForceGraphData
        ↓
visualizationFromLaidOutForceGraph(ForceGraphData)
        ↓
VisualizationGraph          ← shared display model (web/lib/visualizationModel.ts)
        ↓
   ┌────┴────┐
   ▼         ▼
ArchitectureGraphView   RepoPilotCanvas (R3F spike)
(react-force-graph-2d)  (@react-three/fiber + drei)
```

Rules:

- **Do not** recompute imports, hotspots, or confidence in the renderer.
- **Do** treat `VisualizationGraph` as the only contract both renderers need.
- Positions: layout `x,y` → world `(x/scale, −y/scale)`; hotspot score → optional `z` height.
- Fallback: spike page toggles **2D fallback** (same `ForceGraphData`) at any time; WebGL context loss forces 2D.

## Spike UX

| Feature | Behavior |
|---------|----------|
| Camera | OrbitControls, damping (respects `prefers-reduced-motion`) |
| Hover / select | Pointer on meshes; selection dims non-neighbors |
| Focus | Smooth camera tween to node (skipped when reduced motion) |
| Impact edges | Flowing dashed paths source→target; static dashes when `prefers-reduced-motion` |
| Labels | Lightweight HTML labels (Troika Text dropped — worker crashes blanked the scene) |
| Topography batching | Edge-free graphs ≥24 nodes: InstancedMesh for plain file pillars (far/medium); clusters/selection/labels stay interactive |
| Stage sizing | Explicit stage height + absolute canvas so R3F gets a non-zero viewport |
| LOD | `far` (>55): point clouds, few edges · `medium`: boxes + sparse labels · `near`: full basename labels + selection metadata HTML |
| Perf overlay | FPS, frame ms, nodes, edges, visible labels, WebGL draw calls, triangles, camera distance |
| Fixtures | `live` / `small` (15) / `medium` (60) / `large` (250, synth-padded if needed) |

## Files

| Path | Role |
|------|------|
| `web/pages/dashboard/[repoId]/viz-spike.tsx` | Isolated route + 2D/3D toggle |
| `web/components/viz/RepoPilotCanvas.tsx` | R3F scene, LOD, stats |
| `web/lib/visualizationModel.ts` | `visualizationFromLaidOutForceGraph`, `isViz3dSpikeEnabled` |
| `web/lib/visualizationLod.ts` | LOD bands + size fixtures |
| `web/styles/viz-spike.css` | Spike chrome |
| `docs/VIZ_SPIKE_3D.md` | This doc |

Production `ArchitectureGraph.tsx` is **not** replaced.

## How to try

1. Index a repo (or use demo mode).
2. Open `/dashboard/<repoId>/viz-spike`.
3. Switch size presets; orbit in/out for LOD; toggle **2D fallback**.
4. Compare against `/dashboard/<repoId>/architecture`.

## Performance notes (methodology)

Budgets live in `web/lib/vizPerfBudgets.ts` and surface on the spike overlay as **Budget: ok | warn | fail**.

| Signal | OK | Warn | Fail |
|--------|----|------|------|
| FPS | ≥ 45 | 30–44 | < 30 |
| Frame ms | ≤ 22 | 23–40 | > 40 |
| Nodes | ≤ 300 | 301–2000 | > 2000 |
| Draw calls | ≤ band soft cap | ≤ 1.5× cap | > 1.5× cap |

Far LOD soft cap: 120 draws · near/medium: 450.

Automated browser FPS is environment-dependent. Record on the spike overlay:

| Preset | Target nodes | What to record |
|--------|--------------|----------------|
| small | ~15 | Idle FPS, orbit FPS, draw calls |
| medium | ~60 | Same + label count at near vs far |
| large | ~250 | Orbit jank, draw calls, whether far LOD helps |

**Adapter microbench** (Node via `web/lib/vizSpikeAdapter.timing.test.ts`, layout+project only — no GPU): on a typical laptop CPU, small/medium finish well under 50ms and ~250 nodes stay under a few hundred ms (test ceiling: 500ms). Re-run the timing test after layout changes.

**GPU / FPS (manual on `/viz-spike`):** expect near-60 FPS at small/medium with `frameloop="demand"` while idle after orbit; large graphs will show rising draw calls until edges are batched — far LOD should drop visible labels and most edges.

**Qualitative vs 2D:**

- 2D force-graph remains clearer for dense dependency reading and path picking.
- 3D helps spatial “overview / hotspot relief” once LOD is engaged; Troika cost dominates if every label is always on (spike deliberately avoids that).

## Limitations

- Edges are individual `Line` meshes (draw-call heavy at large N); no GPU edge bundling yet.
- No ELK in the spike path (dagre only); ELK can be wired the same as Architecture.
- Topography file pillars batch via InstancedMesh; architecture/impact nodes are still per-mesh.
- Accessibility: 3D is exploratory; keyboard parity incomplete vs 2D toolbar.
- Typography: basename Troika only — full path uses lightweight HTML on selection.
- Synthetic padding on `large` is for stress only, not real analysis.

## Recommendation

**Hybrid 2D/3D** — keep 2D Architecture as the default instrument; optionally offer 3D as an opt-in exploration mode after:

1. Batched edges (nodes already instanced on topography)
2. Shared selection/URL state with Architecture
3. Documented FPS budgets on mid-tier laptops (overlay budgets shipped)

**Do not** replace the product 2D graph with this spike yet. **Do not** revert the shared `VisualizationGraph` adapter — it is useful even if 3D stays a prototype.
