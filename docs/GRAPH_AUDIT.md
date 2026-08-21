# Graph Audit

**Updated:** 2026-08-21  
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
| Barrel / re-export follow | One-hop+ (bounded) through `export {…} from` / `export * from` | `symbolResolve.ts` |
| Package `exports` / `main` | In-repo workspace packages via indexed `package.json` | `packageExports.ts` |
| Static `import()` | Literal dynamic imports → module edges + FileImport | `dynamicImports.ts` |
| Config discovery | `package.json` + tsconfig/jsconfig indexed (not parsed as code) | `fileDiscovery.ts` |
| Edge provenance | `sourceLine` + `targetLine` + detector/confidence | schema + `dependencyGraphBuilder` / `contextGraph` |
| Call edges | AST calls only; confidence tiers (`callEdgePolicy.ts`); not type-aware | `dependencyGraphBuilder` |
| Resolution fixtures | Alias, barrel, star re-export, package exports, dynamic import, cycles | `graphResolution.fixtures.test.ts`, `packageExports.test.ts` |
| MCP | `trace_dependencies`, `get_context_pack` | `api/src/mcp/` |

## Mocked

- Demo architecture fixture
- UI layer chips assume common monorepo prefixes (`api/` / `web/` / `common/`)

## Remaining debt (Gate A)

1. Unresolved aliases still appear when no `paths` match and `@/` heuristic misses
2. ~~Neighborhood expand draws star edges to seed~~ — path closure keeps intermediate hops (2026-08-21)
3. ~~Symbol “calls” are heuristic-only~~ — AST `call_expression` only; tiered confidence; bare property access no longer emits `calls` (2026-08-21)
4. Large repos may need a server-only overview (client clustering helps but is not infinite)
5. ~~`package.json` `exports` + static dynamic-`import()`~~ (done 2026-08-21)
6. ~~Edge `targetLine` not persisted~~ — `sourceLine` + `targetLine` on module/symbol edges (2026-08-21)

## Explicitly deferred (Gate B+)

- First-class graph nodes for Test / PR / ADR / Owner (file + symbol only today)

Roadmap: `docs/ROADMAP_GATES.md`.
