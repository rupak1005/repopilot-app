# UX Audit

**Updated:** 2026-08-20  
**Scope:** Cross-feature UX, IA, a11y, empty/loading/error

## Information architecture (current)

```text
Understand → Dependency Graph, Topography, Search, Wiki
Investigate → Impact, Ask, History
Change → Planning, PRs, Findings
Integrate → MCP
System → Settings (+ index health)
```

Cmd+K covers the same routes. Revision pickers live on Graph / Impact / Wiki where scoped.

## Patterns that work

| Pattern | Notes |
|---------|--------|
| Neo-brutalist shell + mobile drawer | Real; drawer focus restore |
| Index progress float | Real |
| EmptyState / ErrorBanner / IndexHint / Toast | Real (not every page uses EmptyState yet) |
| Citation → Graph / Impact / GitHub | Ask, Search, PR evidence, Findings |
| Skip link + `#main-content` | Dashboard, public, docs |
| Graph Jump-to + reduced-motion pans | Architecture |
| Mobile graph inspector | Bottom sheet under 960px |

## Remaining UX debt

1. Mixed EmptyState vs plain `.empty-state` text across pages
2. Ask failures sometimes surface raw API strings
3. Empty Impact could spell out “what we checked”
4. Force-graph remains primarily pointer-driven (mitigated by Jump-to + sheet)

## Deferred product depth

- Persisted Planning briefs
- Wiki search-within-bodies / ownership overlays on wiki pages
