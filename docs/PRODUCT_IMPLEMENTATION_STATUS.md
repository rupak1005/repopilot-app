# Product Implementation Status

**Master prompt:** RepoPilot World-Class Product + UI/UX Implementation  
**Started:** 2026-08-20

## Phase status

| Phase | Name | Status |
|------:|------|--------|
| 0 | Full product audit | **Done** |
| 1 | Design system foundation | **Done** |
| 2 | App shell + IA | **Done** |
| 3 | Context graph foundation | **Done** |
| 4 | Real dependency graph | **In progress** — clustering, neighborhood, path trace, deep links |
| 5 | Impact analysis | **In progress** — risk factors, confidence, blast map |
| 6 | Codebase topography | Not started (hotspot list only) |
| 7–35 | AI, inspector, history, PR, MCP, eval, … | Not started / partial precursors |

## Phase 4 (continued)

- [x] Directory clustering + expand/collapse
- [x] Neighborhood API + inspector expand
- [x] Shift-click path trace
- [x] Architecture `?file=` deep link (auto-expands cluster)
- [x] Edge confidence → dashed uncertain links
- [ ] ELK / alternate symbol-call views / minimap

## Phase 5 (started)

- [x] Structured `riskFactors` + analysis `confidence` on impact API
- [x] Why-this-risk chips in UI
- [x] Blast radius map + link back to dependency graph
- [ ] Symbol / PR impact modes
- [ ] Canvas blast overlay (reuse ArchitectureGraph)
- [ ] PR-scoped similar-changes on file impact (API is pull-number today)

## Next action

Continue Phase 5 (symbol/PR modes) or Phase 6 topography — ask before committing.
