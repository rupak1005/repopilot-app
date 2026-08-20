# Impact Audit — Phase 0

**Date:** 2026-08-20  
**Scope:** Impact analysis product surface

## What exists

| Piece | Status | Location |
|-------|--------|----------|
| API | Real | `GET …/impact?filePath=&depth=` → `impactAnalysis.ts` |
| Risk | Deterministic `computeRisk` | same |
| Tests | Heuristic `isTestFile` + importers | same |
| Co-change | Real | `CoChangePair` / `getCoChanges` |
| Hotspot overlay | Real | `ModuleHotspot` |
| UI | Form + KPI tiles + lists | `web/pages/dashboard/[repoId]/impact.tsx` |
| Entry from graph | Link `?file=` | Architecture inspector |
| Entry from hotspots | Link | `HotspotList.tsx` |
| MCP | `find_impact` | `mcpTools.ts` |

## What is mocked

- Demo `demoFileImpact` fixtures
- PR detail “impact” sometimes derived from review summary heuristics (not full impact API)

## What is real

- Direct + transitive module dependents (BFS)
- Outbound imports
- Explainable risk thresholds (documented in code + checklist)
- Alias targets: graph traversal no longer requires `File` row; `resolveIndexedFilePath` maps `@/` → disk path when possible

## Gaps vs world-class Impact (Phase 5)

| Capability | Today |
|------------|-------|
| Symbol / PR / API / Security impact modes | File-only |
| Architecture delta visualization | Missing |
| Blast-radius graph overlay | Missing (lists only) |
| Historical similarity UI | API exists (`similar-changes`); weak on impact page |
| Ownership / reviewers | Missing |
| Confidence on whole analysis | Findings have confidence; impact page lacks explicit HIGH/MEDIUM/LOW confidence badge |
| Diff modes | Missing |
| Deep link with revision | Partial (`file` only) |

## Technical debt

1. Impact UI is tabular — does not reuse ArchitectureGraph
2. Default file seed is demo-flavored
3. ~~No “Run impacted tests” / context-pack actions~~ → **context-pack copy on Impact handoff (Phase 33)**
4. Risk explanation is checklist prose, not structured “Why” chips in UI

## Migration plan

1. Surface structured risk factors in UI (centrality, tests, churn, dependents)
2. Embed Impact Graph view (highlight neighborhood from existing deps API)
3. Wire similar-changes + ownership when available
4. Add entry points from Ask citations and PR changed files — **done**
5. Benchmark fixture set — **done** (Phase 29 `impactCalibration` golden scenarios)

## Risk

Medium — over-promising “what breaks” without symbol-level and PR modes will erode trust. Keep file impact correct first.
