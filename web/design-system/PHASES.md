# UI polish phases

Ship one primitive at a time. Each phase ends with a runnable page slice you can review before the next.

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Master tokens + this roadmap | ✅ |
| **1** | `Button` (+ login page only) | ✅ |
| **2** | `IconButton`, `RepoPicker` (topbar only) | ✅ |
| **3** | Sidebar `NavItem` + shell spacing | ✅ |
| **4** | `StatusBadge` + table row hover | ✅ |
| **5** | `KpiTile` + overview bento | ✅ |
| **6** | Ask chat bubbles + composer | ✅ |
| **7** | Search hits + code citation chips | ✅ |
| **8** | Repo picker cards + login polish | ✅ |
| **9** | Page enter transitions (`motion`) | ✅ |
| **10** | Reduced-motion audit + focus rings | ✅ |
| **11** | Neo token foundation + light/dark themes | ✅ |
| **12** | Neo primitives (Button, IconButton, NavItem) | ✅ |
| **13** | Shell + login hero (Layer A) | ✅ |
| **14** | Dashboard page migration (search, ask, pulls…) | ✅ |
| **15** | Repos + mobile nav overlay | ✅ |
| **16** | Dialog, toast, empty/error primitives | ✅ |
| **17** | Visual QA + globals.css legacy purge | ✅ |

## Phase 1 acceptance (Button)

- [x] Primary / secondary / ghost variants
- [x] Spring press on pointer down (Motion)
- [x] Visible focus ring (keyboard)
- [x] `prefers-reduced-motion` respected
- [x] Used on **login** (+ search submit in Phase 7)

## Phase 2 acceptance (IconButton + RepoPicker)

- [x] `IconButton` with required `aria-label`, ghost + subtle variants
- [x] Spring press + focus ring
- [x] `RepoPicker` shows `owner/repo` with mono label + caret
- [x] Phosphor icons on topbar

## Phase 3 acceptance (NavItem + shell)

- [x] `NavItem` with Phosphor icon + label, Next.js `Link`, Motion tap
- [x] Active state uses cyan `--accent`
- [x] Compact nav rows ~36px; sidebar 240px; hairline borders
- [x] Sidebar nav no longer uses Material Symbols

## Phase 4 acceptance (StatusBadge + table)

- [x] `StatusBadge` variants on overview + pulls PR tables
- [x] `ui-data-table` row hover

## Phase 5 acceptance (KpiTile + bento)

- [x] `KpiTile` + `BentoPanel` on overview

## Phase 6 acceptance (Ask chat)

- [x] `ChatBubble` user + assistant roles
- [x] `ChatComposer` with suggestion chips + Phosphor send
- [x] `CitationChip` in assistant citations
- [x] Premium fixed composer bar (cyan focus ring)

## Phase 7 acceptance (Search)

- [x] `SearchHitRow` + `CitationChip` with score
- [x] `ui-search-panel` + mono input + `Button` submit

## Phase 8 acceptance (Repos + login)

- [x] `RepoCard` with owner/name, private lock, updated date
- [x] `ui-repos-page` shell
- [x] Login mark → Phosphor `Code`; error banner uses danger tokens

## Phase 9 acceptance (Page transitions)

- [x] `usePageEnter()` + `AnimatePresence` in `_app.tsx`
- [x] `MotionConfig reducedMotion="user"`

## Phase 10 acceptance (Focus + a11y)

- [x] `focus-audit.css` — focus rings on native + legacy controls
- [x] All new `ui-*` inputs/composers use `--focus-ring`
- [x] Motion tap/enter disabled via `useReducedMotion` / `MotionConfig`

## Phase 14 acceptance (Dashboard pages)

- [x] `page-layout.css` — canvas-inner, page-title, error/empty, ui-input, settings-dl
- [x] Search, pulls, hotspots use neo page chrome
- [x] Settings refactored to `BentoPanel` stack
- [x] Legacy page-title/error/settings rules removed from `globals.css`

## Phase 15 acceptance (Repos + mobile nav)

- [x] `/repos` neo shell + hard-shadow `RepoCard` grid
- [x] `RepoPicker` migrated to semantic neo tokens
- [x] Mobile hamburger → slide-in drawer + backdrop
- [x] Escape / route change / backdrop closes drawer
- [x] Legacy `.repo-grid` / `.repo-item` removed from globals

## Phase 16 acceptance (Feedback primitives)

- [x] `EmptyState` — icon, title, description, action, compact mode
- [x] `ErrorBanner` — dismissible alert wrapping neo `.error-banner`
- [x] `Dialog` — native `<dialog>` modal with footer actions
- [x] `ToastProvider` + `useToast` — bottom-right stack
- [x] Wired on Ask (clear-history dialog + toast), Search, Pulls, Hotspots

## Phase 17 acceptance (Legacy purge)

- [x] `globals.css` trimmed to reset + `.mono` / `.label-caps` utilities (~50 lines)
- [x] Shell layout consolidated in `shell.css`
- [x] Hotspots migrated to `hotspot-list.css` + `ui-hotspot-*` classes
- [x] Remaining pages use `ErrorBanner` / `EmptyState` primitives
- [x] Dead `Icon.tsx` (Material Symbols) removed
- [x] Legacy focus-audit rules for `.btn-primary` / `.ask-composer` removed

## References

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — anti-slop checklist
- [Motion](https://motion.dev/) — React animation
- [Motion Primitives](https://motion-primitives.com/docs) — patterns for later phases
- [SmoothUI](https://smoothui.dev/) — reference only; we own components, no shadcn dump
