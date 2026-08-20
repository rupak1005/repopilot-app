# Graph Audit

**Updated:** 2026-08-20  
**Scope:** Dependency / architecture graph (API + web)

## What exists

| Layer | Status | Location |
|-------|--------|----------|
| Parse → symbols/imports | Real (tree-sitter TS/JS/Python/Go) | `api/src/repo/*`, `repositorySync.ts` |
| Module / symbol edges | Real | `dependencyGraphBuilder.ts` |
| Architecture API | Real | `GET …/architecture` |
| Context graph ops | Real | `GET …/graph` (`shortestPath`, `neighborhood`, `cycles`) |
| UI canvas | Force-graph + Mermaid, Flow/System (ELK), minimap, inspector | `ArchitectureGraph.tsx` |
| Deep links | `?file=&blast=&rev=&layout=` + Copy share link | `revisionScope.ts` |
| Alias resolve | `@/` heuristic + indexed tsconfig/jsconfig `paths` | `moduleResolve.ts`, `tsconfigPaths.ts` |
| MCP | `trace_dependencies`, `get_context_pack` | `api/src/mcp/` |

## Mocked

- Demo architecture fixture
- UI layer chips assume common monorepo prefixes (`api/` / `web/` / `common/`)

## Remaining debt

1. Unresolved aliases still appear when no `paths` match and `@/` heuristic misses
2. Neighborhood expand draws star edges to seed (not true multi-hop paths)
3. Symbol “calls” are heuristic, not type-aware
4. Large repos may need a server-only overview (client clustering helps but is not infinite)

## Explicitly deferred

- First-class graph nodes for Test / PR / ADR / Owner (file + symbol only today)
