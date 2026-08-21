# RepoPilot roadmap gates

**Source:** World-Class Improvements master prompt (2026-08)  
**Rule:** Do not run all phases at once. Advance by gate.

| Gate | Focus | Status |
|------|--------|--------|
| **A — Graph Trust** | Deterministic relationships, provenance, stronger symbol resolution, fixtures | **Complete** (2026-08-21) |
| **B — Impact Trust** | Embedded impact graph, explainable risk, similarity, test impact | **Complete** (2026-08-21) |
| **C — Engineering Loop** | Plan → agent → PR → impact → review → verify | **Complete** (2026-08-21) |
| **D — Visual Differentiation** | 3D topography, impact theater, architecture replay | **Complete** (2026-08-21, opt-in hybrid) |

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

## Gate C — shipped

Plan → agent → PR → impact → review → verify loop.

- `EngineeringLoopStrip` on Planning + Impact + PR detail (`engineeringLoop.ts`)
- Copyable agent brief (`get_context_pack` + `find_impact` + verify reminders)
- PR-aware deep links when `?pull=` / pull impact / pull detail provide a number
- `VerifyChecklist` from `testPlan` with local tick state (PR detail + pull Impact)

See `docs/ENGINEERING_LOOP_AUDIT.md`.

## Gate D — shipped

Visual differentiation beyond the 3D spike (`/viz-spike`). Hybrid 2D/3D — product surfaces stay 2D by default.

- Opt-in **Explore 3D** from Architecture + Topography (`viz3dHref`)
- Spike deep-link focus for `?file=` / `?rev=`
- **Impact theater** (`layoutImpactTheater` + Impact **Explore 3D theater**)
- **Topography terrain** (`layoutTopographyTerrain` + Topography **Explore 3D topography**)
- Spike **perf budgets** on overlay (`vizPerfBudgets.ts`)
- Impact edge **path dash animation** (static under reduced motion)

See `docs/VISUAL_DIFF_AUDIT.md`.
