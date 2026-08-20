# UX Audit — Phase 0

**Date:** 2026-08-20  
**Scope:** Cross-feature UX, IA, a11y, empty/loading/error

## What exists

| Pattern | Status |
|---------|--------|
| Neo-brutalist shell + mobile drawer | Real |
| Index progress float + stages | Real |
| EmptyState / ErrorBanner / IndexHint / Toast | Real |
| Cross-links graph → impact / search / GitHub | Real |
| Ask citations (file + lines) | Real (interactive open limited) |
| Topbar Activity + contextual Help | In progress (local) |
| Dark mode | Real |
| Reduced motion | Partial coverage |

## Information architecture gaps (vs prompt Phase 2)

Current flat nav:

```text
Overview, Search, Ask, PRs, Hotspots, Architecture, Impact, Settings
```

Target grouped IA:

```text
Understand → Architecture, Dependency Graph, Topography, Search, Docs
Investigate → Impact, Ask, History, Hotspots
Change → Planning, PRs, Findings
Integrate → MCP
System → Indexing, Settings
```

Missing surfaces: Findings shipped (Phase 20). Wiki foundation shipped (Phase 25). Planning foundation shipped (Phase 26 — hotspot candidates). Deeper wiki render / persisted briefs still later.
## Progressive disclosure

- Graph starts with capped overview — good instinct, bad hard cap
- Impact dumps lists — OK for v1, needs progressive “why”
- Ask is conversation-first — good

## Accessibility gaps

- Force-graph largely pointer-driven → **mitigated** with Jump-to module select (Phase 15)
- Some table rows are click-only → **fixed** for PR tables (Enter / Space)
- Touch targets generally OK (≥40px on buttons)
- Focus rings present via `focus-audit.css`
- Skip link + main landmark added (Phase 15)
- Mobile drawer focuses on open and restores toggle on close

## Empty / error / loading

| Good | Debt |
|------|------|
| Architecture index-in-progress messaging | Mixed EmptyState vs plain text |
| Ask thinking bubble | Failures sometimes raw API strings |
| IndexHint when not indexed | No “what we checked” on empty impact |

## Migration plan

1. Restructure nav groups without removing routes (aliases OK)
2. Cmd+K command palette over existing routes
3. Revision bar: repo + SHA + index state (data already on index status)
4. Citation actions: open graph / impact / GitHub — **done** (Ask, Search, PR evidence)
5. Mobile: inspector → bottom sheet for graph — **done** (Phase 31)

## Risk

IA churn confuses existing users — ship with redirects and “What’s new” once.
