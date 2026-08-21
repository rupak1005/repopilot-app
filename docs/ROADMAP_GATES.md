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
- Fixture suite: `api/src/repo/graphResolution.fixtures.test.ts`
- Call edges remain explicitly `detector: heuristic` (Phase 1.2 still open)

Still open for Gate A:

- Package `exports` field, dynamic `import()` where static
- Type-aware call relationships (replace heuristics gradually)
- `targetLine` on edges; precision/recall scoreboard beyond fixtures
- Neighborhood multi-hop (not star-to-seed)

See `docs/GRAPH_AUDIT.md`.
