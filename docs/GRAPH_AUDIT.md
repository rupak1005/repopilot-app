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
| Path tracing A→B | Missing |
| Minimap / ELK layouts | Missing (dagre + force only) |
| Deep links (view/selection/zoom) | Partial (`?file=` on impact/search) |

## Technical debt

1. Client 80-node hard cap
2. Unresolved `@/` aliases pollute graph IDs
3. Transitive neighbor expand draws star edges to seed (not true paths)
4. No clustering / LOD / server-side neighborhood pagination
5. Symbol “calls” not type-aware

## Migration plan

1. **Phase 3:** Persist edge `kind` + provenance on write; introduce stable node URNs
2. **Phase 4:** Server `GET …/graph/neighborhood`; remove client 80-cap via clustering
3. Resolve TS path aliases at index time (`@/` → file)
4. Add path-trace + cycle inspector UI
5. Evaluate ELK for hierarchical System View; keep force for exploration

## Risk

High if we dual-write a polymorphic Context Graph before alias resolution and edge provenance land — false confidence in “world-class graph.”
