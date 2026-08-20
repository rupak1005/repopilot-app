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
| 9 | MCP / Integrate | **Done foundation** — tool examples + dashboard links |
| 10–35 | Remaining | Not started / partial |

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

## Phase 8

- [x] PR changed files → Impact + Graph (blast) deep links
- [x] Similar PRs link to pull detail
- [x] Findings severity filter (All / High / Medium / Low)
- [x] Test signals link to file impact when path-like
- [x] Re-fetch live pull impact after manual review

## Phase 9

- [x] MCP tool examples filled with current repo id
- [x] Per-tool “Open in dashboard” links
- [x] Copy repo id + clearer agent-oriented copy

## Next action

Phase 10 (History / revision time machine) or Settings / indexing UX.
