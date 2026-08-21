# Visual Differentiation Audit

**Updated:** 2026-08-21  
**Gate:** D — hybrid 2D/3D exploration  
**Status:** Core opt-in surfaces shipped (Architecture / Impact theater / Topography terrain)  
**Rule:** Product Architecture / Impact / Topography stay **2D by default**. 3D is opt-in.

## What exists

| Surface | Default | Opt-in 3D |
|---------|---------|-----------|
| Architecture | `ArchitectureGraphView` (force-graph 2D) | **Explore 3D →** → `/viz-spike` |
| Topography | CSS `TopographyMap` | **Explore 3D topography →** → `/viz-spike?topo=1` |
| Impact | Blast map + embedded 2D graph | **Explore 3D theater →** → `/viz-spike?file=&blast=1` |
| Shared model | `visualizationModel.ts` | Architecture / theater / terrain layouts |
| Spike | `/dashboard/[repoId]/viz-spike` | `file` / `rev` / `blast` / `topo` / `window` |

## Shipped

1. `viz3dHref` deep links (file / rev / layout / blast / topo / window)
2. Architecture + Topography + Impact entry points (`NEXT_PUBLIC_VIZ_3D_SPIKE=false` kill-switch)
3. Spike focuses `?file=` when present
4. Impact theater — `layoutImpactTheater`
5. Topography terrain — `layoutTopographyTerrain` (district XY + metric Z)

## Deferred (optional polish)

1. ~~Perf budgets / fixtures documented on spike overlay~~ — `vizPerfBudgets.ts` + Budget ok/warn/fail on overlay
2. ~~Reduced-motion path animation for impact edges~~ — flowing dashes when motion OK; static dashes under `prefers-reduced-motion`
3. ~~InstancedMesh batching for dense topography~~ — `vizTopoInstances.ts` batches file pillars at far/medium LOD

See `docs/VIZ_SPIKE_3D.md`, `docs/3D_ARCHITECTURE_AUDIT.md`.
