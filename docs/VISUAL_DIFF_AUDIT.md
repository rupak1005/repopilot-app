# Visual Differentiation Audit

**Updated:** 2026-08-21  
**Gate:** D — hybrid 2D/3D exploration  
**Rule:** Product Architecture / Impact / Topography stay **2D by default**. 3D is opt-in.

## What exists

| Surface | Default | Opt-in 3D |
|---------|---------|-----------|
| Architecture | `ArchitectureGraphView` (force-graph 2D) | **Explore 3D →** → `/viz-spike` (`viz3dHref`) |
| Topography | CSS `TopographyMap` | Link to architecture 3D spike |
| Impact | Blast map + embedded 2D graph | Deep-link via Architecture Explore 3D with `?file=` |
| Shared model | `visualizationModel.ts` | Feeds both 2D layout and `RepoPilotCanvas` |
| Spike | `/dashboard/[repoId]/viz-spike` | Honors `?file=` / `?rev=` focus |

## Shipped this gate chunk

1. `viz3dHref` deep links (file / rev / layout / blast query preserved)
2. Architecture + Topography entry points (kill-switch via `NEXT_PUBLIC_VIZ_3D_SPIKE=false`)
3. Spike focuses `?file=` selection when present
4. **Impact theater** — `?file=&blast=1` loads impact → `layoutImpactTheater` (radial XY + Z bands); entry from Impact **Explore 3D theater**

## Next Gate D chunks

1. True topography 3D (instanced heights) — keep CSS map default
2. Perf budgets / fixtures documented on spike overlay
3. Reduced-motion path animation for impact edges

See `docs/VIZ_SPIKE_3D.md`, `docs/3D_ARCHITECTURE_AUDIT.md`.
