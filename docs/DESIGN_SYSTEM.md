# Design System

**Authoritative tokens:** `web/styles/tokens.css`  
**Layers:** A brand shell · B engineering workspace · C canvas overlays (`neo-panels.css`)

## Typography

| Role | Family | Token |
|------|--------|-------|
| Display / headings | Manrope | `--font-display` |
| Body / UI | Hanken Grotesk | `--font-sans` |
| Technical | JetBrains Mono | `--font-mono` |

Do not use monospace for ordinary prose.

Responsive scales: `--text-display`, `--text-h1`, `--text-h2`, `--text-body` (clamp-based).

## Primary color roles

| Token | Use |
|-------|-----|
| `--color-primary-soft` | Neo fills, chips, brand mark |
| `--color-primary-strong` | Links, emphasis ink |
| `--color-primary-container` | Tinted panels |
| `--color-primary` | Alias → soft (backward compatible) |

Status: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`  
Focus: `--color-focus` + `--focus-ring`

## Motion / a11y

- Durations: `--duration-fast|normal|slow`
- `prefers-reduced-motion` zeros durations in tokens
- `_app.tsx` uses `MotionConfig reducedMotion="user"`

## Theme

`data-theme="light|dark"` on `<html>` via `web/lib/theme.ts`. Dark is a dedicated palette, not an invert.
