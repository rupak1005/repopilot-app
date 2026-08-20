# Topography Audit — Phase 0

**Date:** 2026-08-20  
**Scope:** Codebase topography / hotspot landscape

## What exists

| Piece | Status | Location |
|-------|--------|----------|
| Hotspot scores | Real | `ModuleHotspot` via `historyIngest.ts` |
| Hotspots page | Ranked list (topK=5 via shared hook) | `hotspots.tsx`, `HotspotList.tsx` |
| Graph stroke | Hotspot nodes painted orange | `ArchitectureGraph.tsx` |
| Overview tiles | Mentions hotspots | overview bento |

## What is mocked

- Demo hotspot fixtures in `demoData.ts`

## What is real

- Formula: `changeCount * log(1+dependents) * (1+coChange) * (1+findings)` over ~30d window
- Human-readable `reasons[]`
- Links into Impact

## What does **not** exist

- No topography route or visualization
- No 2D spatial map / terrain / clusters
- No 3D mode
- No time slider (30d/90d/1y)
- No metric toggles (churn vs complexity vs coverage)
- No Three.js / R3F dependency

## Technical debt

1. Hotspots page starved at `topK=5`
2. Hotspots are repo-scoped tables, not revision-scoped — time travel hard
3. No complexity / coverage metrics in DB yet

## Migration plan (Phase 6)

1. Default **2D topography**: treemap or clustered scatter from existing hotspots + fan-in/out
2. Keep 3D optional and off by default (prompt: 2D first)
3. Metric selector + time window once history ingest supports multi-window aggregates
4. Selection → universal inspector → graph / impact
5. Do **not** ship CSS isometric fake 3D

## Risk

Low if we treat topography as a new surface on real hotspot metrics. High if we ship decorative 3D without metrics.
