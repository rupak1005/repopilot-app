# RepoPilot roadmap gates

**Source:** World-Class Improvements master prompt (2026-08)  
**Rule:** Do not run all phases at once. Advance by gate.

| Gate | Focus | Status |
|------|--------|--------|
| **A — Graph Trust** | Deterministic relationships, provenance, stronger symbol resolution, fixtures | **Complete** (2026-08-21) |
| **B — Impact Trust** | Embedded impact graph, explainable risk, similarity, test impact | **Next** |
| **C — Engineering Loop** | Plan → agent → PR → impact → review → verify | Not started |
| **D — Visual Differentiation** | 3D topography, impact theater, architecture replay | Spike only (`/viz-spike`) |

## Gate A — shipped

- Barrel / re-export follow-through (`symbolResolve.ts`)
- In-repo `package.json` `exports` / `main` + static `import()`
- Config discovery (`package.json`, tsconfig/jsconfig)
- Neighborhood path closure (multi-hop induced edges)
- Edge `sourceLine` + `targetLine` provenance
- Call edges only from AST call sites, with tiered confidence (`callEdgePolicy.ts`)
- Labeled precision/recall scoreboard (`graphScoreboard.ts` + fixtures)

**Acceptance floors** (enforced in `graphScoreboard.test.ts`):

| Metric | Floor |
|--------|-------|
| Module resolve precision / recall / unresolved accuracy | 0.95 / 0.90 / 0.95 |
| Symbol resolve precision / recall / unresolved accuracy | 0.95 / 0.90 / 0.95 |

### Deferred past Gate A (do not block Gate B)

- Full type-aware calls via tsc / language service
- Exhaustive alias coverage for exotic monorepo layouts
- Server-only overview for 10k+ node repos

See `docs/GRAPH_AUDIT.md`.

## Gate B — next

Start from `docs/IMPACT_AUDIT.md`:

1. Embed impact graph (not only tabular + Architecture deep link)
2. Surface similar changes strongly
3. Explainable risk / confidence (already partly shipped — keep)
4. Test impact automation entry point (run later; classify first)
