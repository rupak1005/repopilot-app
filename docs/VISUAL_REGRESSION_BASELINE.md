# Visual Regression Baseline — Phase 0

**Date:** 2026-08-20  
**Purpose:** Snapshot inventory before world-class redesign work.

## Captured product surfaces (manual / e2e)

| Surface | Route | Notes |
|---------|-------|-------|
| Landing | `/` | Layer A marketing neo |
| Login | `/login` | OAuth |
| Browse | `/browse` | Public repos |
| Overview | `/dashboard/:id` | Bento + KPIs |
| Architecture | `/dashboard/:id/architecture` | Force + Mermaid |
| Impact | `/dashboard/:id/impact` | Lists + KPIs |
| Hotspots | `/dashboard/:id/hotspots` | List only |
| Ask | `/dashboard/:id/ask` | Chat |
| Search | `/dashboard/:id/search` | Hits |
| PRs | `/dashboard/:id/pulls` | Table |
| Settings | `/dashboard/:id/settings` | Meta |
| MCP | `/mcp`, `/dashboard/:id/mcp` | Connect panel |
| Docs | `/docs/*` | Prose |

## Automated coverage today

- Playwright: `e2e/demo-dashboard.spec.ts` (demo mode nav smoke)
- No Percy/Chromatic/storybook visual suite yet

## Baseline visual DNA to preserve

- Lavender surfaces, 2–3px black borders, hard offset shadows
- Mono for technical labels; sans for UI
- Diagram quiet canvas (`--diagram-*` tokens)
- Dark theme dedicated (not invert)

## Gaps to photograph after each phase

1. Shell (desktop + 390px mobile)
2. Architecture selection + inspector
3. Impact risk panel
4. Future topography 2D
5. Ask citation chip expanded
6. Dark mode variants of 1–5

## Process

Until a visual tool is added: store PNGs under `docs/visual-baseline/` (git-LFS optional) and attach to PRs for shell/graph/impact changes.

## Risk

Without tooling, regressions slip — prioritize shell + architecture screenshots in CI later (Phase 26).
