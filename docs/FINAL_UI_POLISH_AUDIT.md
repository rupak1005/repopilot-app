# Final UI Polish Audit — Phase 0 Baseline

**Date:** 2026-08-21  
**Design read:** Redesign-preserve of RepoPilot’s engineering product UI for senior engineers — neo-brutalist digital-lavender instrument language. Dials: Variance 6 · Motion 4 · Density 7.  
**Freeze status:** Type-check passed · Unit tests passed · Production build (see report)  
**References:** Impeccable `/polish` · Taste anti-slop · existing `web/design-system/MASTER.md` · `web/styles/tokens.css`  
**Out of scope:** Graph algorithms, API contracts, new product features, brand replacement.

---

## Routes / screens enumerated

| Area | Route |
|------|-------|
| Landing | `/` |
| Browse / open | `/browse`, `/[owner]/[repo]` |
| Login / repos | `/login`, `/repos` |
| Public MCP | `/mcp` |
| Docs | `/docs`, `/docs/getting-started`, `/docs/architecture`, `/docs/mcp`, `/docs/api-reference`, `/docs/development`, `/docs/design-system` |
| Overview | `/dashboard/[repoId]` |
| Search | `…/search` |
| Ask | `…/ask` |
| Architecture | `…/architecture` |
| Viz 3D (opt-in) | `…/viz-spike` |
| Impact | `…/impact` |
| Hotspots / Topography | `…/hotspots` |
| Wiki | `…/wiki` |
| History | `…/history` |
| Pulls / PR detail | `…/pulls`, `…/pulls/[number]` |
| Findings | `…/findings` |
| Planning | `…/planning` |
| MCP (repo) | `…/mcp` |
| Settings | `…/settings` |
| 404 | `/404` |

**Screenshot baseline:** existing `docs/VISUAL_REGRESSION_BASELINE.md` + Playwright `e2e/visual-baseline.spec.ts`. Full light/dark/mobile matrix deferred to Phase 45 in the report.

---

## Design tokens & primitives

| Source | Role |
|--------|------|
| `web/styles/tokens.css` | Semantic colors, type, spacing, borders, radii, motion, z-index |
| `web/styles/button.css`, `nav-item.css`, `shell.css`, … | Shared UI |
| Phosphor Icons | Single icon family |
| `EmptyState`, `Button`, `Skeleton`, `ErrorBanner`, `BentoPanel`, `KpiTile`, `StatusBadge` | Shared primitives |

**Doc drift:** `MASTER.md` still says Geist Sans; tokens + docs page use General Sans + Cabinet Grotesk + JetBrains Mono. Brief mentions 280px sidebar; tokens use 240px.

---

## Findings

### P0

**ID:** P0-01  
**Severity:** P0  
**Screen:** Wiki (any)  
**Element:** BFF `…/wiki?path=`  
**Current:** Catch-all was `[...path]`; `?path=` swallowed → list response → “Page not found”.  
**Problem:** Core read path broken for indexed markdown.  
**Desired:** Detail payload for `?path=`.  
**Why it matters:** Trust — docs appear broken.  
**Reference:** Fixed in session (`[...proxy]` + query forward). Verify in regression.

**ID:** P0-02  
**Severity:** P0  
**Screen:** Index progress float  
**Element:** Dismiss (X)  
**Current:** Clear job → AppShell re-opens while indexing.  
**Problem:** User cannot dismiss notification.  
**Desired:** Dismiss sticks for that indexing run.  
**Why it matters:** Calm / control.  
**Reference:** Fixed (`indexProgressFloatGate`). Verify.

### P1

**ID:** P1-01  
**Severity:** P1  
**Screen:** Overview / KPI  
**Element:** Avg Latency tile  
**Current:** `formatLatency(null)` → `n/a`  
**Problem:** Reads like a broken cell.  
**Desired:** `Not available`  
**Why it matters:** Trust / microcopy.  
**Reference:** Brief Phase 10; Impeccable copy polish.

**ID:** P1-02  
**Severity:** P1  
**Screen:** Overview, Pulls  
**Element:** Empty PR panel  
**Current:** “No pull requests indexed yet” / weak next step.  
**Problem:** Feels unfinished; no recovery actions.  
**Desired:** Revision-aware copy + View GitHub / Settings (re-index).  
**Why it matters:** Empty-state language (Phase 10/15).  
**Reference:** Brief Phase 10.

**ID:** P1-03  
**Severity:** P1  
**Screen:** Overview, Pulls, Search, …  
**Element:** Loading copy  
**Current:** Plain `<p className="empty-state">Loading…</p>`  
**Problem:** Flash / no reserved layout.  
**Desired:** Shared `Skeleton` / `PageSkeleton` where structure is known.  
**Why it matters:** Impeccable loading polish.  
**Reference:** `Skeleton.tsx` already exists.

**ID:** P1-04  
**Severity:** P1  
**Screen:** Design system docs  
**Element:** `MASTER.md` / root DESIGN.md  
**Current:** Geist documented; no root DESIGN.md matching Awesome Claude structure.  
**Problem:** Agent/human drift.  
**Desired:** Align MASTER + add root `DESIGN.md` to actual tokens.  
**Why it matters:** Phase 38.  
**Reference:** Awesome Claude Design.

**ID:** P1-05  
**Severity:** P1  
**Screen:** Shell  
**Element:** `--sidebar-width`  
**Current:** 240px  
**Problem:** Brief / brand call for 280px desktop sidebar.  
**Desired:** 280px desktop; keep mobile drawer.  
**Why it matters:** Brand consistency.  
**Reference:** Brief §3.

**ID:** P1-06  
**Severity:** P1  
**Screen:** Activity popover  
**Element:** Close control  
**Current:** Escape / outside click only.  
**Problem:** Undiscoverable dismiss.  
**Desired:** Explicit X.  
**Why it matters:** Interaction quality.  
**Reference:** Fixed this session. Verify.

**ID:** P1-07  
**Severity:** P1  
**Screen:** Buttons globally  
**Element:** `.ui-button`  
**Current:** No `loading` / `aria-busy` variant.  
**Problem:** Incomplete state matrix.  
**Desired:** Loading state without layout shift.  
**Why it matters:** Phase 8 / 32.  
**Reference:** Impeccable interaction states.

**ID:** P1-08  
**Severity:** P1  
**Screen:** Viz spike / topography  
**Element:** Hardcoded `#fff`, `#1a1025`, semantic hex  
**Current:** Bypasses tokens.  
**Problem:** Dark mode + brand drift.  
**Desired:** Tokenized colors.  
**Why it matters:** Phase 25 / 35.  
**Reference:** tokens.css.

### P2

**ID:** P2-01  
**Severity:** P2  
**Screen:** Global CSS  
**Element:** Spacing literals (`19px`, `20px` as `--space-5`, `27px`, …)  
**Current:** Mixed scale + hard px in shell/viz.  
**Problem:** Rhythm drift.  
**Desired:** Prefer 4/8/12/16/24/32/40/48/64; deprecate odd values.  
**Why it matters:** Phase 3.  
**Reference:** Impeccable spacing.

**ID:** P2-02  
**Severity:** P2  
**Screen:** Findings / PR detail  
**Element:** “No findings” empty  
**Current:** Generic blank-ish empty.  
**Desired:** Confidence-aware summary (“No high-confidence issues…”).  
**Why it matters:** Phase 21.  
**Reference:** Brief.

**ID:** P2-03  
**Severity:** P2  
**Screen:** ErrorBoundary  
**Element:** Title “Something broke in this view”  
**Current:** Soft but vague.  
**Desired:** What happened / what’s available / next action (already has actions).  
**Why it matters:** Phase 12.  
**Reference:** Brief error UX.

**ID:** P2-04  
**Severity:** P2  
**Screen:** Nav  
**Element:** Active vs hover weight  
**Current:** Needs audit that active ≠ louder than page content.  
**Problem:** Possible competition with canvas.  
**Desired:** Clear active, quiet siblings.  
**Why it matters:** Phase 6.  
**Reference:** Taste hierarchy.

**ID:** P2-05  
**Severity:** P2  
**Screen:** Architecture / Impact / Ask  
**Element:** Partial / stale / degraded banners  
**Current:** StaleIndexBanner exists; coverage uneven.  
**Problem:** Stale can look “current”.  
**Desired:** Freshness visible on all engineering views.  
**Why it matters:** Phase 14/18.  
**Reference:** Brief.

**ID:** P2-06  
**Severity:** P2  
**Screen:** Dark mode  
**Element:** Surfaces that hardcode light fills  
**Current:** viz-spike and some fallbacks.  
**Problem:** Theme parity gaps.  
**Desired:** Theme-safe tokens everywhere.  
**Why it matters:** Phase 35.  
**Reference:** tokens dark block.

### P3

**ID:** P3-01  
**Severity:** P3  
**Screen:** Marketing / landing  
**Element:** Motion / delight  
**Current:** Restrained; room for 2–3 purposeful moments only.  
**Problem:** Risk of over-animating if chased.  
**Desired:** Keep calm; micro-interactions only (copy → Copied).  
**Why it matters:** Phase 42/47.  
**Reference:** Brief priority order.

**ID:** P3-02  
**Severity:** P3  
**Screen:** Visual regression  
**Element:** Full matrix (dark + mobile + states)  
**Current:** Partial Playwright baselines.  
**Problem:** Incomplete screenshot matrix.  
**Desired:** Expand in Phase 45 without blocking READY WITH MINOR.  
**Why it matters:** Definition of done.  
**Reference:** VISUAL_REGRESSION_BASELINE.md.

---

## Duplicate / inconsistent patterns (inventory)

- Loading: mix of `empty-state` text vs `Skeleton`
- Empty PR copy duplicated Overview + Pulls
- Shadow language: tokens (`3/4/8px`) vs viz hardcodes (`2/5px`)
- Font docs: Geist (MASTER) vs General Sans (tokens)
- Border weight: Layer A 3px heavy vs brief “2px structural”

---

## Missing states checklist (high level)

| State | Coverage |
|-------|----------|
| Empty | Present via EmptyState; copy uneven |
| Loading | Partial skeletons; many plain strings |
| Partial / stale | StaleIndexBanner; incomplete |
| Error | ErrorBanner + ErrorBoundary; some raw “Failed to load…” |
| Success | Index float ready; button success rare |
| Disabled | Buttons yes; inputs uneven |
| Focus | Tokens `--focus-ring`; audit incomplete |
| Reduced motion | Token durations → 0; some CSS animations need audit |

---

## Next

Implement P1 findings in priority order (clarity → consistency → trust), then continue screen polish without redesigning IA.
