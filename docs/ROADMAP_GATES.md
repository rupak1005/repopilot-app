# RepoPilot roadmap gates

**Source:** World-Class Improvements master prompt (2026-08)  
**Rule:** Do not run all phases at once. Advance by gate.

| Gate | Focus | Status |
|------|--------|--------|
| **A — Graph Trust** | Deterministic relationships, provenance, stronger symbol resolution, fixtures | **In progress** (Phase 1.1 / 1.4 started) |
| **B — Impact Trust** | Embedded impact graph, explainable risk, similarity, test impact | Not started |
| **C — Engineering Loop** | Plan → agent → PR → impact → review → verify | Not started |
| **D — Visual Differentiation** | 3D topography, impact theater, architecture replay | Spike only (`/viz-spike`) |

## Gate A — current chunk

Shipped in this gate so far:

- Barrel / re-export follow-through (`api/src/repo/symbolResolve.ts`)
- Correct public names for `export { a as b }` / `export … from`
- In-repo `package.json` `exports` / `main` resolution (`packageExports.ts`)
- Static `import('…')` → imports + module edges (`dynamicImports.ts`)
- Index `package.json` + tsconfig/jsconfig for resolve (no Tree-sitter parse)
- Fixture suites for alias / barrel / package exports / dynamic import
- Neighborhood path closure (BFS ancestors kept so depth-2 edges stay real, not star-to-seed)
- Call edges remain explicitly `detector: heuristic` (Phase 1.2 still open)

Still open for Gate A:

- Type-aware call relationships (replace heuristics gradually)
- `targetLine` on edges; precision/recall scoreboard beyond fixtures
- Remaining unresolved aliases when no `paths` / `@/` match

See `docs/GRAPH_AUDIT.md`.
