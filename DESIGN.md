# RepoPilot DESIGN.md

Persistent design context for humans and agents. Refine in place — do not invent a new brand.

**Design read:** Premium engineering instrument — neo-brutalist digital-lavender, evidence-dense, calm complexity.  
**Dials:** Variance 6 · Motion 4 · Density 7 (engineering density; not sparse “premium empty”).

Source of tokens: `web/styles/tokens.css`. Implementation notes: `web/design-system/MASTER.md`.

---

## Visual Theme & Atmosphere

- Tactile neo-brutalism: near-black structural ink, hard offset shadows, restrained radii.
- Digital lavender surfaces for brand moments; pale surfaces for reading, code, dense data.
- Feels like a serious engineering tool — not generic SaaS, glass AI, or cyberpunk.

## Color Palette & Roles

| Role | Token | Use |
|------|-------|-----|
| Background | `--color-background` | App chrome wash |
| Surface | `--color-surface` | Cards, panels, popovers |
| Primary soft | `--color-primary` / `--color-primary-soft` | Fills, selected chips |
| Primary strong | `--color-primary-strong` | Links, emphasis |
| Ink / border | `--color-border-strong` | Structural borders |
| Text | `--color-text` / muted / subtle | Hierarchy |
| Success / warn / danger | semantic tokens | Status only — sparingly |

Purple is for primary action, selection, active nav, and brand moments — not every state.

Light + `[data-theme='dark']` are first-class. Do not invert light colors ad hoc.

## Typography Rules

| Role | Font | Token |
|------|------|-------|
| Brand / marketing display | Cabinet Grotesk | `--font-display` |
| UI / headings / body / nav | General Sans | `--font-sans` |
| Paths, SHAs, symbols, code | JetBrains Mono | `--font-mono` |

- No additional fonts.
- Uppercase only for micro labels (`.label-caps`).
- Prefer hierarchy via size/weight before more color or borders.
- Numeric / SHA metadata: mono + tabular where practical.

## Component Stylings

- **Borders:** Layer B default `2px` (`--border-medium`); Layer A heavy `3px` for primary brand surfaces only.
- **Radii:** `--radius-sm` 6 · `--radius-md` 8 · `--radius-lg` 10 — keep related components consistent.
- **Buttons:** `.ui-button` — default / hover / focus-visible / active / disabled / loading. Hard shadow lifts on hover; compress on active without layout shift.
- **Nav:** Quiet siblings; active item uses container fill + hard shadow — unmistakable but not louder than page content.
- **Empty states:** Icon + headline + one sentence + primary/secondary action (`EmptyState`).
- **Loading:** Prefer `Skeleton` / `PageLoading` over bare “Loading…” text when layout is known.
- **Icons:** Phosphor only, `weight="light"` default.

## Layout Principles

- Desktop sidebar: `--sidebar-width: 280px`.
- Structure each screen around the primary engineering task (overview health → graph explore → impact consequences → ask with evidence).
- Generous space between major sections; compact density inside inspectors, tables, and metadata.
- Avoid equal-weight card grids when one signal should dominate.

## Depth & Elevation

| Surface | Shadow |
|---------|--------|
| Primary card | `--shadow-hard-md` (4px) to `--shadow-hard-lg` (8px) |
| Button / control | `--shadow-hard-sm` (3px); 1–2px when pressed |
| Overlay | restrained soft `--shadow-soft` when needed |

Do not stack multiple shadows or put hard offsets on every label.

## Motion

| Token | Target |
|-------|--------|
| `--duration-fast` | ~120ms micro |
| `--duration-normal` | ~180ms standard |
| `--duration-slow` | ~240ms panels |
| `--ease-out-expo` | `cubic-bezier(0.23, 1, 0.32, 1)` |

Use motion for drawers, focus transitions, button press, progress — not every card or graph edge.  
Honor `prefers-reduced-motion` (durations collapse to 0 in tokens).

## Do's and Don'ts

**Do**

- Use semantic tokens from `tokens.css`.
- Keep copy precise, calm, technical.
- Show stale / partial / empty with recovery actions.
- Prefer “Not available” over “n/a” for missing metrics.

**Don't**

- Generic purple gradients, glassmorphism, confetti, sparkle AI chrome.
- Soft blur shadows on primary CTAs.
- New color palettes or extra typefaces in polish passes.
- Change graph algorithms or API semantics for visuals.

## Responsive Behavior

- Collapse sidebar to drawer below ~768px; keep touch targets ≥40px.
- Graph / impact / ask need deliberate mobile compositions — not stacked desktop clones.
- Long paths/titles: ellipsis + title tooltip or wrap — never silent clip of controls.

## Agent Prompt Guide

When editing UI:

1. Preserve neo-brutalist lavender identity.
2. Prefer smallest token-aligned CSS/component change.
3. Complete interaction states (hover/focus/active/disabled/loading).
4. Empty/loading/error/stale before decorative polish.
5. Priority order: Clarity → Consistency → Trust → Interaction → A11y → Performance → Character → Delight.
