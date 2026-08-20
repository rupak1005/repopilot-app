# 3D Visual Language

**Updated:** 2026-08-21  
**Status:** Draft — channels for the shared `VisualizationNode` / `VisualizationEdge` model  
**Code:** `web/lib/visualizationModel.ts`

Typography and geometry encode data as **hints**. Exact values always live in the inspector / list fallback.

## Metric → visual channel

| Metric | Channel | Scale | Range / meaning | Accessibility fallback |
|--------|---------|-------|-----------------|------------------------|
| Hotspot score | Color warmth + size | sqrt | Higher = warmer / larger | Show `score` number |
| Churn (`changeCount`) | Height (Z / bar) | sqrt | Taller = more recent change | Show change count |
| Dependents | Footprint / size | sqrt | Larger = more dependents | Show dependent count |
| Findings | Accent mark / opacity | linear | More findings = stronger mark | Show findings count |
| Impact proximity | Z depth + opacity | stepped | 0 seed · 1 direct · 2 transitive · 3 tests | Blast list roles |
| Risk (LOW/MED/HIGH) | Color | discrete | LOW lavender · MED purple · HIGH red/orange | Risk badge + score |
| Edge confidence | Stroke style | threshold | `<0.9` dashed / uncertain | “Uncertain” label |
| Edge type imports | Thin solid | — | Structural dependency | Edge type label |
| Edge type impact | Thick highlight | — | Blast relationship | “Impact” in list |

## Color (Digital Lavender–safe)

| Role | Approximate token |
|------|-------------------|
| Seed / selected | `--color-primary-strong` |
| Direct impact | Purple / link |
| High risk | `--color-danger` |
| Medium / warn | `--color-warning` |
| Low / context | muted text / grey |
| Uncertain edge | low-opacity dashed |

Exact hex should follow `tokens.css` — do not invent neon glow hierarchy.

## Typography (when 3D labels land)

| Level | Face | Use |
|-------|------|-----|
| Architecture district | General Sans ExtraBold | Cluster landmarks (`cluster:api`) |
| Module / file | General Sans | Runtime Troika SDF labels |
| Paths / SHAs / metrics | JetBrains Mono | Inspector + metadata |
| Cabinet Grotesk | Marketing monuments only | Not dense graph labels |

## Motion

| Event | Duration | Reduced motion |
|-------|----------|----------------|
| Impact propagation | 250–700ms | Instant reveal |
| Camera focus | short ease-out | Snap |
| Decorative float / pulse | off by default | Always off when `prefers-reduced-motion` |

## Non-negotiables

- Never make typography the only risk signal.
- Never render uncertain AST edges as certain.
- Never leave force physics running forever.
- Always provide 2D / list fallback for the same metrics.
