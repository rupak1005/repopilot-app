# Product Implementation Status

**Master prompt:** RepoPilot World-Class Product + UI/UX Implementation  
**Started:** 2026-08-20

## Phase status

| Phase | Name | Status |
|------:|------|--------|
| 0–3 | Audits, design system, shell, context graph | **Done** |
| 4 | Real dependency graph | **Done foundation** — clusters, path, neighborhood, cycles |
| 5 | Impact analysis | **Done foundation** — file / symbol / PR + blast overlay |
| 6 | Codebase topography | **Done foundation** — 2D map + metrics + lookback |
| 7 | Ask / Search UX | **Done foundation** — citation Graph / Impact / GitHub |
| 8–35 | Remaining | Not started / partial |

## Phase 5

- [x] File impact risk factors + confidence + blast map
- [x] PR impact aggregation
- [x] Symbol impact (`symbolName` / `symbolId`) with callers + cycle signal
- [x] Canvas ArchitectureGraph blast overlay (`?file=&blast=1`)

## Phase 6

- [x] 2D topography clusters
- [x] Metric toggles: hotspot score / churn / dependents / findings
- [x] Time window lookback (7d / 30d / 90d / 1y) via `windowDays`
- [ ] Optional 3D (deferred)

## Phase 4 extras

- [x] Module cycle inspector (`graph?op=cycles`)
- [x] `@/` import alias resolve at graph build (package-root heuristic)

## Phase 7

- [x] Citation actions: Graph / Impact / GitHub (Ask, Search, PR evidence)
- [ ] History time machine surface (deferred)
- [ ] Universal search merge (deferred)

## Next action

Phase 8 (PR / Change workflow polish) or History surface — ask before committing.
