# UI Audit

**Updated:** 2026-08-20  
**Scope:** `@repopilot/web` (Next.js Pages Router)

## What exists

| Area | Status | Location |
|------|--------|----------|
| Framework | Next.js 16 Pages Router, React 19 | `web/pages/` |
| Design tokens | Semantic light/dark CSS vars, Layers A/B/C | `web/styles/tokens.css`, `neo-panels.css` |
| Fonts | Manrope (display) · Hanken Grotesk (body) · JetBrains Mono | Design system |
| App shell | Grouped sidebar, topbar, mobile drawer, Cmd+K | `AppShell.tsx`, `shellNav.ts` |
| Dashboard routes | overview, architecture, hotspots, search, wiki, impact, ask, history, planning, pulls, findings, settings, mcp | `web/pages/dashboard/[repoId]/` |
| BFF proxy | Session-gated allowlist | `web/pages/api/repositories/[repoId]/[...path].ts` |
| Theme | Light / dark / system | `web/lib/theme.ts` |
| Motion | `motion` + user reduced-motion | `_app.tsx` |
| Visual CI | Playwright soft screenshots | `e2e/visual-baseline.spec.ts` |

## Mocked

- `NEXT_PUBLIC_DEMO_MODE` fixtures in `web/lib/demoData.ts`

## Dependencies

- Phosphor, `react-force-graph-2d`, `dagre`, `elkjs`, `mermaid`, `motion`
- **Not present:** React Flow, Cytoscape, Three.js / R3F (3D topography deferred)

## Remaining debt

1. No shared client data cache (per-page `useState` + `fetch`)
2. Inconsistent empty/loading primitives
3. Graph overview still client-clustered; very large repos may need server overview
4. Stay on Pages Router until there is a concrete App Router migration need
