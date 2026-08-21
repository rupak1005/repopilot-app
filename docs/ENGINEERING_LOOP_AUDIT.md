# Engineering Loop Audit

**Updated:** 2026-08-21  
**Gate:** C — Plan → agent → PR → impact → review → verify

## What exists

| Stage | Status | Location |
|-------|--------|----------|
| Plan | Hotspot candidates + seed deep link | `/planning`, `planning.ts` |
| Agent | MCP page + context pack + **agent brief** | `/mcp`, `engineeringAgentBrief`, Impact handoff |
| PR | Pulls list / detail | `/pulls` |
| Impact | File / symbol / PR blast + similar + testPlan | `/impact` |
| Review | PR review findings + trigger | pull detail |
| Verify | Classified local test commands (copy) | `testPlan` / Impact panel |
| Loop UI | Ordered strip + copy brief; **PR-aware** when `pull` / pullNumber set | `EngineeringLoopStrip`, Planning, Impact, PR detail |

## Mocked / deferred

- No automated progression tracking (stages are navigational, not stateful)
- No remote agent run or CI gate enforcement
- Review stage links to `/pulls` until a PR number is known

## Next Gate C chunks

1. Persist loop progress per file / PR (optional)
2. ~~Wire Review stage to a specific PR when `?pull=` is present~~ — `pullNumber` on stages + PR detail strip (2026-08-21)
3. Post-review verify checklist that ticks testPlan commands
