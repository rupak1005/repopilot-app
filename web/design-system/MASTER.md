# RepoPilot Design System — Master

**Design read:** Developer tool with **neo-brutalist tactile hierarchy** inspired by [GitDiagram](https://gitdiagram.com/) principles — not a visual clone. Technical, confident, purple/lavender surfaces, hard offset shadows, evidence-dense dashboard.

**Dials:** Variance 6 · Motion 4 · Density 7

## Anti-patterns (never ship)

- Generic SaaS cyan/green gradients (legacy Mission Control)
- Soft blurred shadows on primary CTAs
- 3px black borders on every row/cell
- Glassmorphism on main panels
- Cloning GitDiagram copy, logo, or page structure
- Material Symbols / mixed icon families

## Palette

See `styles/tokens.css` — semantic `--color-*` with light default and `[data-theme="dark"]`.

| Layer | Borders | Shadow |
|-------|---------|--------|
| A Brand | 3px heavy | 8×8 hard |
| B App | 2px medium | 3–4px hard |
| C Canvas | 1px soft | blur + soft |

## Typography

- **UI:** Geist Sans
- **Data:** JetBrains Mono
- Headlines normal case; uppercase only for micro labels

## Motion

- Hover: `translate(-2px, -2px)` on primary controls
- Active: `translate(1px, 1px) scale(0.97)`
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)`

## Iconography

Phosphor Icons only — `weight="light"` default

## Phased rollout

See [PHASES.md](./PHASES.md) and [MIGRATION.md](./MIGRATION.md).
