# Visual Regression Baseline

**Updated:** 2026-08-20  
**Purpose:** Keep flagship chrome from regressing without a hosted visual SaaS.

## Surfaces worth watching

| Surface | Route |
|---------|-------|
| Landing | `/` |
| Architecture | `/dashboard/:id/architecture` |
| Impact | `/dashboard/:id/impact` |
| Topography | `/dashboard/:id/hotspots` |
| Wiki | `/dashboard/:id/wiki` |
| Findings | `/dashboard/:id/findings` |
| Ask | `/dashboard/:id/ask` |
| Shell (mobile) | any dashboard @ 390px |

## Automated coverage

- `e2e/demo-dashboard.spec.ts` — demo nav smoke
- `e2e/visual-baseline.spec.ts` — landing / architecture / impact **structural** smoke (DOM assertions)

Pixel PNG snapshots were removed from the required CI e2e job: GitHub Ubuntu Chromium and local Fontshare metrics produced recurring size/AA mismatches (Playwright rejects ±1px dimension drift even with `maxDiffPixelRatio`). Prefer Percy / Chromatic when visual lock is needed again.

Update / re-enable pixel baselines only behind an optional job, not the merge gate.

## Design DNA to preserve

- Hard borders + offset shadows (neo layers)
- Mono for paths / SHAs; display font for page titles
- Quiet diagram canvas (`--diagram-*` tokens)
- Dedicated dark theme (not inverted light)

## Deferred

- Percy / Chromatic / Storybook visual suite
- Dark-mode + mobile screenshot matrix in CI
