# UI Audit — Phase 0

**Date:** 2026-08-20  
**Scope:** `@repopilot/web` (Next.js Pages Router)

## What exists

| Area | Status | Location |
|------|--------|----------|
| Framework | Next.js 16 Pages Router, React 19 | `web/pages/` |
| Design tokens | Semantic light/dark CSS vars, Layers A/B/C | `web/styles/tokens.css`, `neo-panels.css` |
| App shell | Sidebar + topbar + mobile drawer | `web/components/AppShell.tsx`, `shell.css` |
| Dashboard routes | overview, search, ask, pulls, hotspots, architecture, impact, settings, mcp | `web/pages/dashboard/[repoId]/` |
| BFF proxy | Session-gated allowlist to API | `web/pages/api/repositories/[repoId]/[...path].ts` |
| Theme | Light/dark + system sync | `web/lib/theme.ts` |
| Motion | `motion` + `reducedMotion="user"` | `_app.tsx` |
| Docs site | Design system / architecture docs pages | `web/pages/docs/` |

## What is mocked

- `NEXT_PUBLIC_DEMO_MODE` fixtures in `web/lib/demoData.ts` (architecture, ask, search, PRs, impact)
- Architecture explainer copy is monorepo-oriented even for live repos
- Impact page default path seed: `api/src/services/PaymentService.ts`

## What is real

- Live fetch to API for architecture, impact, search, ask, hotspots, pulls when demo off
- Force-graph + dagre + Mermaid architecture canvas
- Index status SSE/poll + progress float
- GitHub OAuth session

## Dependencies

- Phosphor icons, `react-force-graph-2d`, `dagre`, `mermaid`, `motion`
- **Not present:** React Flow, Cytoscape, Three.js / R3F

## Technical debt

1. No shared client data cache (per-page `useState` + `fetch`)
2. Inconsistent empty/loading primitives (EmptyState vs raw `.empty-state`)
3. 80-node graph cap in `toForceGraphData`
4. MCP page not in primary nav
5. Fonts are Geist + JetBrains Mono — prompt wants Manrope + Hanken Grotesk + JetBrains Mono
6. Canvas keyboard navigation weak

## Migration plan

1. Freeze Layer A/B/C token contract; add `--color-primary-strong/soft/container`
2. Swap display/body fonts to Manrope / Hanken Grotesk
3. Reorganize shell IA (Understand / Investigate / Change / Integrate)
4. Add Command Palette (Cmd+K) and revision context bar
5. Do not migrate to App Router until graph/impact UX stabilizes

## Risk

Medium — shell/token changes touch every page; mitigate with visual regression of dashboard chrome.
