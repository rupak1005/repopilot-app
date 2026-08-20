# Graph Audit — Phase 0

**Date:** 2026-08-20  
**Scope:** Dependency / architecture graph (API + web)

## What exists

| Layer | Status | Location |
|-------|--------|----------|
| Parse → symbols/imports | Real (tree-sitter TS/JS/Python/Go) | `api/src/repo/*`, `repositorySync.ts` |
| Module edges | Real `ModuleDependency` | `dependencyGraphBuilder.ts` |
| Symbol edges | Real `SymbolDependency` (heuristic calls) | same |
| Architecture API | Real | `GET …/architecture`, `engineeringIntelligence.ts` |
| Context graph API | Real, narrow | `GET …/graph`, `contextGraph.ts` |
| Neighbors / deps | Real BFS depth-bounded | `dependencyGraphQueries.ts` |
| UI canvas | Force-graph + Mermaid, inspector, rebuild | `ArchitectureGraph.tsx` |
| MCP | `trace_dependencies`, `get_context_pack` | `api/src/mcp/` |

## What is mocked

- Demo architecture fixture (~11 nodes)
- UI layer chips assume `api/` / `web/` / `common/` prefixes
- Edge `provenance` always `'parser'` at API layer (not stored in DB)

## What is real

- Import-derived module graph from indexed revision
- Hotspot overlay on nodes
- Cycle detection (symbol SCC)
- Alias modules (`@/…`) appear as graph nodes when unresolved

## Edge / node model vs target Context Graph

| Target | Today |
|--------|-------|
| Node kinds: File, Symbol, Test, PR, ADR, Owner, … | **file, symbol only** |
| Edge kinds: imports, calls, tests, owns, … | **imports, calls only** (API labels) |
| Edge provenance with line/confidence | Partial — no DB columns |
| Progressive neighborhood | Partial — full architecture capped at 80 nodes client-side |
| Path tracing A→B | Done (`op=shortestPath` + Shift-click) |
| Minimap / ELK layouts | ELK layered System View + interactive minimap (click-to-pan) |
| Deep links (view/selection/zoom) | Selection + blast + rev + layout (`?file=&blast=&rev=&layout=`); Copy share link |
| Cycle inspector | Done (`op=cycles` + architecture panel) |

## Technical debt

1. Unresolved aliases still appear when no tsconfig `paths` match and `@/` heuristic misses
2. Transitive neighbor expand draws star edges to seed (not true paths)
3. Symbol “calls” not type-aware
4. ~~No ELK hierarchical System View~~ → **done** (Flow/System toggle; dagre remains default)
5. ~~No graph minimap~~ → **done** (Phase 22)

## Migration plan

1. **Phase 3 (done):** Persist edge `kind` + provenance on write; introduce stable node URNs (`file:…`, `symbol:…`); bounded `shortestPath` query
2. **Phase 4 (done foundation):** Directory clustering; `GET …/graph?op=neighborhood`; path-trace UI; module cycle inspector
3. Resolve TS path aliases at index time (`@/` → file) — **done** (heuristic + Phase 24 tsconfig `paths`)
4. Optional ELK hierarchical System View — **done** (Phase 21)
5. Graph minimap — **done** (Phase 22)
6. Evaluate server-only overview for 10k+ node repos

## Risk

High if we dual-write a polymorphic Context Graph before alias resolution and edge provenance land — false confidence in “world-class graph.” Provenance columns + URNs reduce that risk for imports/calls; other node kinds remain deferred.
