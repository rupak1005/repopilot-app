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
- `e2e/visual-baseline.spec.ts` — landing / architecture / impact screenshots (committed PNGs)

Update baselines:

```bash
yarn playwright test e2e/visual-baseline.spec.ts --update-snapshots=changed
```

## Design DNA to preserve

- Hard borders + offset shadows (neo layers)
- Mono for paths / SHAs; display font for page titles
- Quiet diagram canvas (`--diagram-*` tokens)
- Dedicated dark theme (not inverted light)

## Deferred

- Percy / Chromatic / Storybook visual suite
- Dark-mode + mobile screenshot matrix in CI
