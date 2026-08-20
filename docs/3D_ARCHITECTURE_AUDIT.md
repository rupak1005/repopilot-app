# 3D Architecture Audit

**Updated:** 2026-08-21  
**Status:** Phase 1 complete · Phase 2 model shipped · **R3F spike** at `/dashboard/[repoId]/viz-spike` (see `docs/VIZ_SPIKE_3D.md`)  
**Scope:** Dependency Graph · Impact · Topography · typography · shared visualization model

This audit grounds the “3D Typography + Data Visualization” master prompt against the **shipped** RepoPilot monorepo. It is the required gate before Phase 2 (rendering foundation).

---

## 1. Product north star (unchanged)

RepoPilot should make a developer feel: **“I can see how this codebase behaves.”**

Correctness, evidence, accessibility, and performance outrank spectacle. 3D is an **exploration mode**, not a replacement for today’s 2D instruments.

---

## 2. Current state (what is actually shipped)

### 2.1 Correction: not “static CSS mocks”

Earlier design mockups looked presentation-like. **Production pages already bind real (or demo-fixture) data:**

| Surface | Renderer today | Data |
|---------|----------------|------|
| **Dependency / Architecture** | `react-force-graph-2d` canvas + optional Mermaid SVG | `GET …/architecture` (+ neighborhood / path / cycles) |
| **Impact** | CSS blast map + KPIs + optional Architecture `?blast=1` overlay | `GET …/impact` (file / symbol / PR) |
| **Topography (Hotspots)** | CSS weighted grid (`TopographyMap`) | `GET …/hotspots` |

There is **no Three.js / R3F / WebGL** in `web/package.json`.

### 2.2 Design system already matches much of the brief

| Brief | Shipped |
|-------|---------|
| Neo-brutalist lavender | Yes (`tokens.css`) |
| Manrope | **No** — **General Sans** + **Cabinet Grotesk** (Fontshare) + **JetBrains Mono** (Google Fonts) |
| Hard borders / hard shadows | Yes |
| Sidebar ~280px | Yes (`--sidebar-width`) |

**Recommendation:** Keep General Sans + JetBrains Mono for viz. Use Cabinet Grotesk only for rare marketing / typographic monuments — not dense graph labels. Self-host fonts under `public/fonts/` before shipping Troika (check Fontshare OFL/FFL per family).

### 2.3 Key files

| Concern | Path |
|---------|------|
| Shared Context Graph vocabulary | `common/src/contextGraph.ts` |
| Architecture API slice | `api/src/services/engineeringIntelligence.ts` |
| Graph ops (path / neighborhood / cycles) | `api/src/services/contextGraph.ts`, `dependencyGraphQueries.ts` |
| Impact | `api/src/services/impactAnalysis.ts` |
| Hotspots | `listModuleHotspots` in engineering intelligence |
| Web architecture model + clustering | `web/lib/architecture.ts` |
| Canvas | `web/components/ui/ArchitectureGraph.tsx` |
| Layout | `web/lib/dagreLayout.ts`, `elkLayout.ts` |
| Topography | `web/lib/topography.ts`, `web/components/ui/TopographyMap.tsx` |
| Impact blast UI | `web/components/ui/ImpactBlastMap.tsx`, `web/lib/blastOverlay.ts` |
| Prior audits | `docs/GRAPH_AUDIT.md`, `IMPACT_AUDIT.md`, `TOPOGRAPHY_AUDIT.md` |

---

## 3. Data model gap (the real blocker)

There is **no** `VisualizationNode` / `VisualizationEdge`. Three parallel models exist:

1. **Context Graph** (`ContextGraphNode` / `ContextGraphEdge`) — URN ids, edge `kind` + `provenance`
2. **Architecture / ForceGraph** — path / `cluster:` ids, stripped confidence
3. **Impact / Hotspot list payloads** — not graphs; overlays are derived client-side

### Gaps vs the master prompt’s unified model

| Need | Today |
|------|--------|
| Stable entity `id` | Diverges (URN vs filePath) |
| `entityType` | CG has kinds; Architecture UI is file/cluster only |
| Metrics bag (risk, churn, complexity, centrality, coverage) | Split across hotspot score, impact risk, architecture `score` |
| Edge evidence | Full on CG; mostly dropped for canvas |
| Revision awareness | Graph/impact yes; **hotspots are repo-scoped**, not revision-scoped |
| Adapter layer | Missing |

**Canonical source of truth to extend:** `@repopilot/common` Context Graph.  
**Required before 3D scenes:** a Visualization Adapter that projects CG + metrics → `VisualizationNode` / `VisualizationEdge` (revision-aware).

---

## 4. Renderer / library decision

### Evaluate (from brief)

| Option | Fit for RepoPilot |
|--------|-------------------|
| **A. Custom R3F + Troika** | Best for typography LOD, topography landmarks, shared design system |
| **B. r3f-forcegraph** | Useful for discovery layouts; do not make default architecture layout |
| **C. 3d-force-graph** | Good reference / spike; avoid as the product shell |

### Recommendation

**Preferred stack (when Phase 2 starts):**

- `three`
- `@react-three/fiber`
- `@react-three/drei` (includes Troika-backed `<Text>`)
- `troika-three-text` (or via drei)

**Keep existing:**

- `dagre` / `elkjs` for **deterministic** Architecture / DAG positions (feed x,y into 3D; Z = metric)
- `react-force-graph-2d` + Mermaid as **2D / accessible / mobile defaults**
- Do **not** add 3d-force-graph as a parallel product shell unless a spike proves R3F cannot meet perf

**Typography:**

| Level | Tech | When |
|-------|------|------|
| SDF labels | Troika / drei `Text` | Default runtime labels |
| Floating labels | Troika + billboard | Selection / high priority |
| Extruded | `TextGeometry` | Rare monuments / landing only |
| Monuments | Troika or TextGeometry | District titles (AUTH, PAYMENTS) |

**Do not extrude every label.**

---

## 5. Flagship mapping: today → target

### A. Real Dependency Graph

| Brief requirement | Today | Next |
|-------------------|-------|------|
| Real edges | Yes (AST) | Keep |
| Evidence | CG provenance; UI underuses it | Surface in inspector |
| Layout modes | Flow (dagre) + System (ELK) | Add Z metric mappings; freeze force if used |
| Path A→B | `op=shortestPath` | Animate only selected path |
| Cluster / LOD | Client clustering | Progressive expand + label LOD |
| 3D | None | Opt-in “Explore 3D” with 2D default |
| Mobile | 2D sheet / Mermaid | Keep 2D default |

### B. Impact Analysis

| Brief requirement | Today | Next |
|-------------------|-------|------|
| Real impact | Yes | Keep |
| Spatial layers | Flat CSS columns | Optional Z-bands (direct → transitive → tests) |
| Risk color | Risk badges | Shared color scale + legend |
| Propagation motion | None | 250–700ms, respect `prefers-reduced-motion` |
| Evidence hops | Partial in payload | First-class path + citations |
| 2D fallback | Blast map + lists | Remain primary on mobile |

### C. Codebase Topography

| Brief requirement | Today | Next |
|-------------------|-------|------|
| Real metrics | Hotspot score / churn / dependents / findings | Add centrality/coverage when indexed |
| 2D map | CSS grid | Keep as default / mobile |
| 3D terrain | None | Instanced boxes; height = metric |
| Districts | Top-level folder clusters | Label landmarks via Troika |
| Time windows | 7/30/90/365 days | Keep; don’t perpetual-animate |
| Revision | **Not revision-scoped** | Fix or clearly label “repo-level” |

---

## 6. Performance policy (adopt as budget)

Starting thresholds (tune with fixtures):

| Entities | Default |
|----------|---------|
| &lt; 300 | Full 2D; 3D OK |
| 300–2,000 | Optimized 3D (cluster + label LOD) |
| 2,000–10,000 | Cluster-first 3D |
| &gt; 10,000 | 2D / cluster-first by default |

Mandatory techniques when 3D ships: InstancedMesh for repeated blocks, label LOD, frustum/distance culling, **demand-driven render** (no idle 60 FPS), WebGL failure → 2D.

Desktop target: ~60 FPS typical exploration. Mobile: **2D preferred**.

---

## 7. Accessibility & product rules (non-negotiable)

- Every 3D view has **2D + list/table** fallback
- Keyboard focus + inspector summary for screen readers
- `prefers-reduced-motion`: no fly-throughs / pulses / perpetual motion
- Exact metrics always in inspector (typography never sole signal)
- No LLM-invented edges; uncertain edges stay low-opacity dashed
- Deep links stay lean (`file`, `rev`, `metric`, `layout`) — already partially shipped

---

## 8. Recommended implementation order (revised)

| Phase | Deliverable | Gate |
|-------|-------------|------|
| **1** | This audit | Done |
| **2** | Visualization Adapter + shared metric/color/height scales (2D first) | Unblocks all views |
| **3** | `docs/3D_VISUAL_LANGUAGE.md` (channel → metric → a11y) | Before 3D chrome |
| **4** | R3F canvas shell + WebGL fail + dispose + demand render | Spike on Architecture only |
| **5** | Troika label engine + LOD | No TextGeometry yet |
| **6** | Architecture “Explore 3D” (dagre/ELK XY + metric Z) | Keep 2D default |
| **7** | Impact Z-bands + reduced-motion path | Keep blast map |
| **8** | Topography 3D (instanced) + revision clarity | Keep CSS 2D |
| **9** | Perf budgets, fixtures (S/M/L/stress), visual regression | Ship gate |
| **10** | Typography monuments / marketing only if product asks | Optional |

**Do not** start with landing-page extruded titles. Ship understanding first.

---

## 9. Explicit non-goals (near term)

- Making 3D mandatory on mobile
- Replacing Context Graph with a force-only layout as the architecture default
- Extruding every module label
- Decorative city blocks unrelated to indexed entities
- Continuous edge particles / shader behind dense graphs
- Multiple competing 3D frameworks in one app

---

## 10. Definition of ready for Phase 2

Phase 2 may begin when product agrees:

1. Context Graph remains the evidence source of truth  
2. Shared Visualization Adapter lands (or is the first ticket)  
3. 2D Architecture / Impact / Topography remain defaults  
3D is progressive enhancement  
4. Stack is R3F + Troika (not 3d-force-graph as shell)  
5. Fonts: General Sans + JetBrains Mono for viz; Cabinet Grotesk monuments only  

---

## 11. Suggested first tickets (smallest correct diffs)

1. **`web/lib/visualizationModel.ts`** — done (`VisualizationNode` / `Edge` + Architecture / Hotspot / Impact adapters + scales)
2. **`docs/3D_VISUAL_LANGUAGE.md`** — done (channel table)
3. **Hotspots revision note or revision-scoped API** — honesty before topography 3D  
4. **Architecture inspector:** show edge `kind` + confidence from neighborhood when available  
5. **Optional spike branch:** R3F canvas that consumes adapter positions only (no product nav change)

---

## 12. Summary

RepoPilot already has a **real** Context Graph and usable 2D instruments. The master prompt’s gap is not “add Three.js decorations” — it is:

1. Unify projection into a visualization model  
2. Encode metrics consistently (height / color / size)  
3. Add 3D as an opt-in spatial exploration layer with Troika LOD  
4. Keep 2D, lists, and evidence inspectors as the trustworthy core  

Until Phase 2 is approved, **do not install** `three` / `@react-three/fiber` on `master`.
