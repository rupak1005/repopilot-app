# RepoPilot roadmap gates

**Source:** World-Class Improvements master prompt (2026-08)  
**Rule:** Do not run all phases at once. Advance by gate.

| Gate | Focus | Status |
|------|--------|--------|
| **A — Graph Trust** | Deterministic relationships, provenance, stronger symbol resolution, fixtures | **Complete** (2026-08-21) |
| **B — Impact Trust** | Embedded impact graph, explainable risk, similarity, test impact | **Complete** (2026-08-21) |
| **C — Engineering Loop** | Plan → agent → PR → impact → review → verify | **In progress** (loop strip + agent brief) |
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

## Gate B — shipped

1. ~~Embed impact graph~~ — `ImpactBlastGraph` on file Impact
2. ~~Surface similar changes strongly~~ — file impact + `?file=` on `/similar-changes`
3. Explainable risk / confidence (calibrated factors + UI chips)
4. ~~Test impact entry~~ — `buildImpactTestPlan` + copyable local commands (`testPlan` on impact API)

### Deferred past Gate B

- Remote / CI test execution
- Diff / security-specific impact modes

## Gate C — next

Plan → agent → PR → impact → review → verify loop.

Shipped so far:

- `EngineeringLoopStrip` on Planning + Impact (`engineeringLoop.ts`)
- Copyable agent brief (`get_context_pack` + `find_impact` + verify reminders)

See `docs/ENGINEERING_LOOP_AUDIT.md`.
