# Impact Audit

**Updated:** 2026-08-20  
**Scope:** Impact analysis product surface

## What exists

| Piece | Status | Location |
|-------|--------|----------|
| API | File / symbol / PR modes | `impactAnalysis.ts`, `GET …/impact` |
| Risk + confidence | Deterministic + calibrated fixtures | `computeRisk`, `impactCalibration.ts` |
| Risk factors UI | Structured chips | Impact page |
| Blast map | Lists + ArchitectureGraph overlay (`?blast=1`) | `ImpactBlastMap`, graph deep link |
| Co-change | Real | `getCoChanges` |
| Ownership | CODEOWNERS from indexed revision | `GET …/ownership`, Impact panel |
| Handoff | Planning / MCP / Copy context pack / Graph blast | Impact file view |
| Citations | Graph / Impact / GitHub from Ask, Search, PRs | `citationLinks.ts` |
| MCP | `find_impact`, `get_context_pack` | `mcpTools.ts` |

## Mocked

- Demo `demoFileImpact` / `demoOwnership` fixtures
- PR detail summary heuristics when full impact API is not re-run

## Remaining debt

1. Impact canvas still mostly tabular (blast map + deep link to ArchitectureGraph, not a full embedded graph)
2. Similar-changes API exists; Impact file mode does not surface it strongly
3. No “run impacted tests” automation (recommendations are listed only)
4. Diff / security-specific impact modes not built

## Calibration

Golden scenarios in `api/src/services/impactCalibration.ts` lock risk / confidence / factor ids. Do not claim finer calibration without extending that table.
