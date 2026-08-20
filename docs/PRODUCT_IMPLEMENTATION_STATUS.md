# Product Implementation Status

**Master prompt:** RepoPilot World-Class Product + UI/UX Implementation  
**Started:** 2026-08-20

## Phase status

| Phase | Name | Status |
|------:|------|--------|
| 0 | Full product audit | **Done** — see audit docs below |
| 1 | Design system foundation | **Done** — Manrope/Hanken/JetBrains + primary roles |
| 2 | App shell + IA | **Done** — grouped nav, revision bar, Cmd+K |
| 3 | Context graph foundation | **In progress** — URNs, provenance columns, shortestPath |
| 4 | Real dependency graph | Partial (exists; needs scale/provenance) |
| 5 | Impact analysis | Partial (API real; UI tabular) |
| 6 | Codebase topography | Not started (hotspot list only) |
| 7–35 | AI, inspector, history, PR, MCP, eval, … | Not started / partial precursors |

## Phase 0 deliverables

- [x] `docs/UI_AUDIT.md`
- [x] `docs/GRAPH_AUDIT.md`
- [x] `docs/IMPACT_AUDIT.md`
- [x] `docs/TOPOGRAPHY_AUDIT.md`
- [x] `docs/UX_AUDIT.md`
- [x] `docs/VISUAL_REGRESSION_BASELINE.md`

## Phase 2 deliverables

- [x] Grouped sidebar IA (`web/lib/shellNav.ts`): Understand / Investigate / Change / Integrate / System
- [x] Architecture → “Dependency Graph”; Hotspots → “Topography” (same `/hotspots` route)
- [x] MCP under Integrate + `activeNav="mcp"`
- [x] Revision context bar (`repo · rev · status`) under topbar
- [x] Cmd/Ctrl+K command palette (`CommandPalette` + Commands button)

## Phase 3 deliverables (foundation)

- [x] Shared vocabulary + stable node URNs in `@repopilot/common` (`contextGraph.ts`)
- [x] Edge `kind` + provenance columns on `ModuleDependency` / `SymbolDependency` (+ migration)
- [x] Graph builder writes detector/confidence/sourceFile/sourceLine
- [x] `GET …/graph` returns URN node ids + rich provenance; architecture mapper unwraps paths
- [x] Bounded `shortestPath` via `GET …/graph?op=shortestPath&from=&to=`
- [ ] Populate remaining node kinds (Test, PR, ADR, Owner, …) as detectors land
- [ ] Full query surface (centrality, communities, allPaths) — Phase 4+

**Apply migration before re-index:** `api/prisma/migrations/20260820170000_phase3_context_graph_provenance/`

## Honest product summary

RepoPilot already has a **real** parse → graph → search → explainable impact → grounded Ask/PR pipeline. It is **not** yet a world-class interactive OS for software systems: topography is missing, the graph is capped and monorepo-biased, impact lacks a decision-support UI, and Context Graph node/edge richness is still incomplete beyond File/symbol + imports/calls.

## Recommended build order (unchanged from prompt)

```text
Phase 1 Design system → Phase 2 Shell/IA → Phase 3 Context Graph
  → Phase 4 Graph UX/scale → Phase 5 Impact UX → Phase 6 Topography 2D
  → then Evidence AI / Inspector / cross-links
```

## Next action

Finish Phase 3 migration on deploy DBs, then **Phase 4** dependency graph UX/scale (neighborhood API, drop client 80-cap via clustering).
