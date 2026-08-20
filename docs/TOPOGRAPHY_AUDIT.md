# Topography Audit — Phase 0

**Date:** 2026-08-20  
**Scope:** Codebase topography / hotspot landscape

## What exists

| Piece | Status | Location |
|-------|--------|----------|
| Hotspot scores | Real | `ModuleHotspot` via `historyIngest.ts` |
| Topography page | 2D directory clusters + ranked list (`topK=40`) | `hotspots.tsx`, `TopographyMap.tsx` |
| Graph stroke | Hotspot nodes painted orange | `ArchitectureGraph.tsx` |
| Overview tiles | Mentions hotspots (still `topK=5`) | overview bento |

## What is mocked

- Demo hotspot fixtures in `demoData.ts`

## What is real

- Formula: `changeCount * log(1+dependents) * (1+coChange) * (1+findings)` over ~30d window
- Human-readable `reasons[]`
- Links into Impact
- 2D cluster map sized/colored by hotspot score

## Gaps vs world-class Topography

- No time slider (30d/90d/1y)
- No metric toggles (churn vs complexity vs coverage)
- No 3D mode (intentionally deferred; 2D default)
- Hotspots are repo-scoped, not revision-scoped

## Migration plan (Phase 6)

1. **Started:** 2D directory-cluster topography on `/hotspots` (Topography) with `topK=40`
2. Metric toggles without inventing fake complexity
3. Time window once hotspot rows are revision-scoped
4. Keep 3D optional and metric-mapped only
5. Benchmark large repos before claiming landscape UX

## Risk

Medium — a pretty map without trustworthy scores is worse than a ranked list. Current blocks are driven only by existing `ModuleHotspot` scores.
