# Topography Audit

**Updated:** 2026-08-20  
**Scope:** Codebase topography / hotspot landscape

## What exists

| Piece | Status | Location |
|-------|--------|----------|
| Hotspot scores | Real | `ModuleHotspot` via `historyIngest.ts` |
| Topography page | 2D directory clusters + ranked list | `/hotspots`, `TopographyMap.tsx` |
| Metrics | Score / churn / dependents / findings | Topography toggles |
| Lookback | 7d / 30d / 90d / 1y (`windowDays`) | Hotspots API + UI |
| Graph stroke | Hotspot nodes painted | `ArchitectureGraph.tsx` |
| Planning feed | Hotspots → change candidates | `/planning` |

## Mocked

- Demo hotspot fixtures in `demoData.ts`

## Explicitly deferred

- **3D topography** — not in v1; 2D map is the product landscape

## Remaining debt

- Hotspots are repo-scoped, not fully revision-scoped; non-30d windows recompute churn live
- Large-repo landscape UX still needs production benchmarking
