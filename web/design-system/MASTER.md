# RepoPilot Design System — Master

**Design read:** B2B developer-tool dashboard for senior engineers — Linear × GitHub mission control, restrained motion, high data density (cockpit), not a marketing landing page.

**Dials:** Variance 5 · Motion 4 · Density 8

## Anti-patterns (never ship)

- AI purple/pink gradients, mesh hero backgrounds, three equal feature cards
- Material Symbols / generic icon font stacks
- Inter as the only typeface (Geist + JetBrains Mono)
- Harsh drop shadows, 1px `#30363d` borders everywhere with no hierarchy
- Instant state changes — all interactive elements use spring or eased motion
- Animating layout properties (`width`, `height`, `top`, `left`)

## Palette (Mission Control — refined)

| Token | Value | Use |
|-------|-------|-----|
| `--bg-base` | `#09090b` | App canvas |
| `--bg-elevated` | `#111113` | Sidebar, panels |
| `--bg-surface` | `#18181b` | Cards, inputs |
| `--border-hairline` | `rgba(255,255,255,0.06)` | Default borders |
| `--border-strong` | `rgba(255,255,255,0.10)` | Hover / focus |
| `--text-primary` | `#fafafa` | Headings, body |
| `--text-secondary` | `#a1a1aa` | Labels, meta |
| `--text-tertiary` | `#71717a` | Disabled, hints |
| `--accent` | `#22d3ee` | Primary actions, active nav |
| `--accent-dim` | `#0891b2` | Focus rings |
| `--success` | `#22c55e` | Pass / healthy |
| `--warn` | `#eab308` | Warn |
| `--danger` | `#ef4444` | Fail |

## Typography

- **UI:** Geist Sans — 14px body, 13px dense tables, tight tracking on headings
- **Data:** JetBrains Mono — PR numbers, repo IDs, citations, caps labels

## Motion ([Motion](https://motion.dev/))

- **Tap:** `scale: 0.98`, spring `stiffness: 400, damping: 30`
- **Hover:** opacity / border-color only; optional `y: -1px` on primary CTAs
- **`prefers-reduced-motion`:** disable scale/blur; keep color transitions ≤ 120ms

## Iconography

- **Phosphor Icons** — `weight="light"` default, `regular` for emphasis

## Spacing

- 4px grid; sidebar 240px; table row 36px; panel padding 16–20px

## Phased rollout

See [PHASES.md](./PHASES.md). One primitive per phase; do not skip ahead.
