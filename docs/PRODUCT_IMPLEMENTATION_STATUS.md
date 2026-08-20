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
| 8 | PR / Change workflow | **Done foundation** — file links, finding filters |
| 9 | MCP / Integrate | **Done foundation** — tool examples + dashboard links |
| 10 | History / revisions | **Done foundation** — revisions list + history search |
| 11 | Settings / indexing | **Done foundation** — index health + re-index |
| 12 | Overview polish | **Done foundation** — pulse + quick actions |
| 13–35 | Remaining | Not started / partial |

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
- [ ] History time machine surface (deferred) → **started as Phase 10**
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

## Phase 10

- [x] History page: indexed revisions timeline
- [x] Commit / PR history search (`search/history`)
- [x] Nav + Cmd+K entry under Investigate
- [ ] Per-revision graph switch (deferred)

## Phase 11

- [x] Index health panel (state, SHA, file/symbol counts, last error)
- [x] Re-index button wired to `/api/repositories/:id/index` + progress float
- [x] Copy RepoPilot ID + links to History / MCP
- [x] IndexHint mentions Settings re-index

## Phase 12

- [x] Overview pulse from live index status + PR/hotspot counts
- [x] Quick actions: Ask, Search, Graph, Impact, History
- [x] Hotspots panel link to Topography; Settings deep link
- [x] Differentiator MCP copy de-branded to agents

## Next action

Phase 13 (Docs / onboarding polish) or revision-scoped graph viewing.
