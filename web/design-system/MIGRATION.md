# GitDiagram-Inspired Design Migration

**Status:** Phases 11–17 complete · [GitDiagram](https://gitdiagram.com/) as design DNA, not a clone

## A. Design-system summary

### Tokens (`web/styles/tokens.css`)

- **Semantic colors:** `--color-background`, `--color-surface-*`, `--color-primary`, `--color-text-*`, `--color-border-*`
- **Shadows:** `--shadow-hard-lg/md/sm` (8/4/3px offset), `--shadow-soft` for canvas
- **Borders:** `--border-heavy` (3px), `--border-medium` (2px), soft 1px
- **Motion:** `--ease-out-expo`, `--duration-*`, reduced-motion overrides
- **Legacy bridge:** `--bg-base`, Stitch `--surface-*` → semantic tokens (bridge only; no legacy CSS classes)

### Three layers

| Layer | Use |
|-------|-----|
| **A** | Login, index hints — 3px border + 8px shadow |
| **B** | Shell, bento, KPI, nav — 2px border |
| **C** | Diagram toolbar/stats — soft blur |

### Themes

- **Light default:** lavender `hsl(269 100% 95%)`
- **Dark:** `[data-theme="dark"]` — violet-black, not inverted light
- Toggle in AppShell · persisted `repopilot-theme`

## B. Migration map

| Old | New |
|-----|-----|
| Cyan accent | Purple `--color-primary` |
| Gradient buttons | Flat + 3px border + hard shadow |
| Dark-only shell | Light + dark themes |
| Stitch green tokens | Token bridge |
| `globals.css` monolith | Per-feature CSS + slim reset |
| Material Symbols | Phosphor Icons |
| `.panel`, `.hotspot-list`, `.btn-*` | `BentoPanel`, `ui-hotspot-*`, `Button` |

## C. Screens & primitives (complete)

- All dashboard routes + `/login` + `/repos`
- Primitives: `Button`, `IconButton`, `NavItem`, `KpiTile`, `BentoPanel`, `StatusBadge`, `ChatBubble`, `ChatComposer`, `SearchHitRow`, `RepoCard`, `EmptyState`, `ErrorBanner`, `Dialog`, `ToastProvider`
- CSS modules: `tokens`, `neo-panels`, `page-layout`, `feedback`, `shell`, `hotspot-list`, + component styles

## D. Style file index

| File | Scope |
|------|--------|
| `globals.css` | Reset + utilities only |
| `shell.css` | App shell layout + mobile nav |
| `page-layout.css` | Page chrome, inputs, settings |
| `feedback.css` | Empty, error, dialog, toast |
| `hotspot-list.css` | Hotspot bento rows |
| `*.css` per primitive | Button, nav, tables, etc. |

## E. QA

- Build: `yarn workspace @repopilot/web build`
- Tests: `yarn workspace @repopilot/web test --project web`
- Manual checklist:
  - Light/dark toggle on overview, login, architecture
  - Mobile nav drawer at ≤768px
  - Ask clear-history dialog + toast
  - Search empty vs no-results states
  - Hotspot bars + tags on overview

## F. Cleanup log

- Added: `neo-panels.css`, `page-layout.css`, `feedback.css`, `hotspot-list.css`, `lib/theme.ts`
- Removed: ~700 lines legacy CSS from `globals.css`, `Icon.tsx` (Material Symbols)

See [PHASES.md](./PHASES.md) for phased rollout history.
