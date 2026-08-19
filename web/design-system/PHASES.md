# UI polish phases

Ship one primitive at a time. Each phase ends with a runnable page slice you can review before the next.

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Master tokens + this roadmap | ✅ |
| **1** | `Button` (+ login page only) | ✅ Motion spring + Phosphor-ready |
| **2** | `IconButton`, `RepoPicker` (topbar only) | ✅ Motion + Phosphor |
| **3** | Sidebar `NavItem` + shell spacing | pending |
| **4** | `StatusBadge` + table row hover | pending |
| **5** | `KpiTile` + overview bento | pending |
| **6** | Ask chat bubbles + composer | pending |
| **7** | Search hits + code citation chips | pending |
| **8** | Repo picker cards + login polish | pending |
| **9** | Page enter transitions (`motion`) | pending |
| **10** | Reduced-motion audit + focus rings | pending |

## Phase 1 acceptance (Button)

- [x] Primary / secondary / ghost variants
- [x] Spring press on pointer down (Motion)
- [x] Visible focus ring (keyboard)
- [x] `prefers-reduced-motion` respected
- [x] Used on **login** only — no mass replace yet

## Phase 2 acceptance (IconButton + RepoPicker)

- [x] `IconButton` with required `aria-label`, ghost + subtle variants
- [x] Spring press + focus ring (CSS)
- [x] `RepoPicker` shows `owner/repo` with mono label + caret
- [x] Wired in **topbar only** — sidebar nav still Stitch/Material until Phase 3
- [x] Swap inline SVG → Phosphor (`@phosphor-icons/react`)

## References

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — anti-slop checklist
- [Motion](https://motion.dev/) — React animation
- [Motion Primitives](https://motion-primitives.com/docs) — patterns for later phases
- [SmoothUI](https://smoothui.dev/) — reference only; we own components, no shadcn dump
