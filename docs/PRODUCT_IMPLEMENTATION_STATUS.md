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
| 13 | Docs / onboarding | **Done foundation** — checklist + tour refresh |
| 14 | Landing / marketing | **Done foundation** — brand hero + how-it-works |
| 15 | Accessibility / motion | **Done foundation** — skip link, landmarks, keyboard rows |
| 16 | Revision-scoped graph | **Done foundation** — `?rev=` + History deep links |
| 17 | Universal search | **Done foundation** — code + history scopes |
| 18 | Impact revision deep links | **Done foundation** — `?rev=` on Impact + citations |
| 19 | Planning / Wiki stubs | **Done foundation** — nav + roadmap stubs |
| 20–35 | Remaining | Not started / partial |

## Phase 5

- [x] File impact risk factors + confidence + blast overlay
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
- [x] Universal search merge → **Phase 17**

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
- [x] Per-revision graph switch (Architecture `?rev=` + History Graph links)

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

## Phase 13

- [x] First-run onboarding checklist on Getting started
- [x] Dashboard tour updated for Graph / Topography / History / Settings / citations
- [x] Docs nav + MCP page titled for agents; API reference covers new query ops
- [x] Introduction links to MCP docs

## Phase 14

- [x] Brand-first landing hero (RepoPilot + headline + analyze CTA)
- [x] How-it-works section (paste → index → investigate)
- [x] Differentiators moved below the fold; docs/MCP footer links
- [x] Shared landing copy module + tests

## Phase 15

- [x] Skip-to-main link on dashboard, public pages, and docs
- [x] `#main-content` landmark + focus restore for mobile nav drawer
- [x] Keyboard-activatable PR table rows (Enter / Space)
- [x] Graph “Jump to” module select + reduced-motion camera pans
- [x] Index status `aria-live` + dialog `aria-labelledby`

## Phase 16

- [x] Architecture revision picker (`?rev=`) over indexed revisions
- [x] Architecture / cycles / impact / neighborhood / path scoped by `revisionSha`
- [x] History “Graph” links open the matching revision
- [x] Shared `revisionScope` helpers + tests

## Phase 17

- [x] Search page runs code + history queries together
- [x] All / Code / History scope tabs with counts (`?scope=`)
- [x] Shared `universalSearch` helpers + tests

## Phase 18

- [x] Impact page revision picker + `revisionSha` on file / symbol / PR analyze
- [x] `impactHref` / citation Graph+Impact preserve `?rev=`
- [x] History revision row: Graph + Impact deep links
- [x] Blast map / graph handoff keep the selected SHA

## Phase 19

- [x] Planning stub under Change (roadmap + Impact / Topography / PRs exits)
- [x] Wiki stub under Understand (roadmap + Ask / Graph / Docs exits)
- [x] Nav + Cmd+K + help tips for both surfaces
- [x] Shared `surfaceStubs` helpers + tests

## Next action

Phase 20 (Findings surface) or deferred ELK / 3D topography.
