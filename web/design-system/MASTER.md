# RepoPilot Design System — Master

**Design read:** Developer tool with **neo-brutalist tactile hierarchy** — technical, confident, purple/lavender surfaces, hard offset shadows, evidence-dense dashboard. Not a visual clone of any reference product.

**Dials:** Variance 6 · Motion 4 · Density 7

Canonical product rules: root [`DESIGN.md`](../../DESIGN.md). Tokens: [`styles/tokens.css`](../styles/tokens.css).

## Anti-patterns (never ship)

- Generic SaaS cyan/green gradients (legacy Mission Control)
- Soft blurred shadows on primary CTAs
- 3px black borders on every row/cell
- Glassmorphism on main panels
- Cloning GitDiagram copy, logo, or page structure
- Material Symbols / mixed icon families
- Extra fonts beyond Cabinet Grotesk + General Sans + JetBrains Mono

## Palette

See `styles/tokens.css` — semantic `--color-*` with light default and `[data-theme="dark"]`.

| Layer | Borders | Shadow |
|-------|---------|--------|
| A Brand | 3px heavy | 8×8 hard |
| B App | 2px medium | 3–4px hard |
| C Canvas | 1px soft | blur + soft |

## Typography

- **Display (marketing):** Cabinet Grotesk — `--font-display`
- **UI / body / nav:** General Sans — `--font-sans`
- **Data / paths / SHAs:** JetBrains Mono — `--font-mono`
- Headlines normal case; uppercase only for micro labels

## Layout

- Desktop sidebar: `280px` (`--sidebar-width`)
- Header: `--header-height: 64px`

## Motion

- Hover: hard-shadow lift on primary controls
- Active: `translate(1px, 1px)` compress (buttons)
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` via `--ease-out-expo`
- Respect `prefers-reduced-motion`

## Iconography

Phosphor Icons only — `weight="light"` default

## Phased rollout

See [PHASES.md](./PHASES.md) and [MIGRATION.md](./MIGRATION.md).
