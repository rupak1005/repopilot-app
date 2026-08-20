# Product Implementation Status

**Master prompt:** RepoPilot World-Class Product + UI/UX  
**Status:** Phase 0–35 foundation **complete** (2026-08-20)

## Shipped (current product)

| Area | What’s live |
|------|-------------|
| Shell / IA | Grouped nav, Cmd+K, revision context, skip links, dark mode |
| Graph | Clusters, path trace, neighborhood, cycles, Flow/System (ELK), minimap, shareable `?file=&blast=&rev=&layout=` |
| Impact | File / symbol / PR modes, risk factors + confidence, blast map, handoff (Planning / MCP / context pack), CODEOWNERS |
| Topography | 2D map, metric toggles, lookback windows |
| Ask / Search | Citations → Graph / Impact / GitHub; universal code + history search |
| Change | Planning candidates, Findings board (severity / category / `?q=`), PR workflow |
| Wiki | Indexed markdown / ADRs, kind filters, inline reader (`?path=`) |
| History | Revisions timeline + history search + deep links |
| Integrate | MCP examples, `get_context_pack` clipboard handoff |
| Quality | Impact calibration fixtures, Playwright visual baselines, a11y/motion passes |
| Alias resolve | `@/` heuristic + indexed `tsconfig` / `jsconfig` `paths` |

## Explicitly deferred

- **3D topography** — 2D is the v1 landscape
- Extra Context Graph node kinds (Test, PR, ADR, Owner as first-class graph nodes)
- Hosted visual review (Percy / Chromatic) — soft Playwright baselines cover CI for now
- Persisted named Planning briefs across sessions

## Audit docs (living)

| Doc | Role |
|-----|------|
| [GRAPH_AUDIT.md](./GRAPH_AUDIT.md) | Graph capabilities + remaining debt |
| [IMPACT_AUDIT.md](./IMPACT_AUDIT.md) | Impact capabilities + remaining debt |
| [TOPOGRAPHY_AUDIT.md](./TOPOGRAPHY_AUDIT.md) | Topography + deferred 3D |
| [UX_AUDIT.md](./UX_AUDIT.md) | IA / a11y / empty states |
| [UI_AUDIT.md](./UI_AUDIT.md) | Web stack + shell debt |
| [VISUAL_REGRESSION_BASELINE.md](./VISUAL_REGRESSION_BASELINE.md) | Screenshot inventory + Playwright |

## Follow-ups (optional)

- Ownership chips on the graph inspector (Impact already shows CODEOWNERS)
- Server-side overview for 10k+ node repos
- Stricter empty/loading primitive consistency across pages
