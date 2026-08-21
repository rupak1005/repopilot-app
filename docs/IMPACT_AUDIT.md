# Impact Audit

**Updated:** 2026-08-21  
**Scope:** Impact analysis product surface

## What exists

| Piece | Status | Location |
|-------|--------|----------|
| API | File / symbol / PR modes | `impactAnalysis.ts`, `GET …/impact` |
| Risk + confidence | Deterministic + calibrated fixtures | `computeRisk`, `impactCalibration.ts` |
| Risk factors UI | Structured chips | Impact page |
| Blast map | Lists + **embedded force graph** + Architecture deep link | `ImpactBlastGraph`, `ImpactBlastMap`, `?blast=1` |
| Co-change | Real | `getCoChanges` |
| Similar changes | Real for PR + **file impact** (seed = file ∪ co-change partners) | `findSimilarChanges`, `findSimilarChangesForFile`, Impact file panel |
| Test plan | Classified workspace commands + copy handoff | `common/impactTestPlan`, `testPlan` on impact, `ImpactTestPlanPanel` |
| Ownership | CODEOWNERS from indexed revision | `GET …/ownership`, Impact panel |
| Handoff | Planning / MCP / Copy context pack / Graph blast | Impact file view |
| Citations | Graph / Impact / GitHub from Ask, Search, PRs | `citationLinks.ts` |
| MCP | `find_impact`, `get_context_pack` | `mcpTools.ts` |

## Mocked

- Demo `demoFileImpact` / `demoOwnership` fixtures
- PR detail summary heuristics when full impact API is not re-run

## Remaining debt

1. ~~Impact canvas still mostly tabular~~ — embedded `ImpactBlastGraph` on file Impact (2026-08-21); full Architecture still via deep link
2. ~~Similar-changes API exists; Impact file mode does not surface it strongly~~ — file impact returns + shows similar PRs (2026-08-21)
3. ~~No “run impacted tests” automation~~ — classify + copyable local commands shipped; remote execution deferred
4. Diff / security-specific impact modes not built

## Calibration

Golden scenarios in `api/src/services/impactCalibration.ts` lock risk / confidence / factor ids. Do not claim finer calibration without extending that table.
